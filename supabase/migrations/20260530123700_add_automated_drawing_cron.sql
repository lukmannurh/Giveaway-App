-- 20260530123700_add_automated_drawing_cron.sql

-- Create the function to resolve expired rooms
CREATE OR REPLACE FUNCTION public.resolve_expired_rooms()
RETURNS void AS $$
DECLARE
    r RECORD;
    winner_row RECORD;
    participant_count INT;
    actual_winners INT;
    prize_per_winner INT;
BEGIN
    -- Loop over active rooms that have expired
    FOR r IN 
        SELECT * FROM public.rooms 
        WHERE state = 'active' AND closes_at <= now()
    LOOP
        -- Count participants
        SELECT COUNT(*) INTO participant_count 
        FROM public.participants 
        WHERE room_id = r.id;

        IF participant_count = 0 THEN
            -- No participants, refund host 10 credits if host exists
            IF r.host_id IS NOT NULL THEN
                UPDATE public.users 
                SET credits = credits + 10 
                WHERE id = r.host_id;
                
                INSERT INTO public.transactions (user_id, amount, description) 
                VALUES (r.host_id, 10, 'Refund: Empty Room');
            END IF;

            -- Mark room as finished
            UPDATE public.rooms 
            SET state = 'finished', 
                drawing_started_at = now(),
                drawing_completed_at = now(),
                drawing_participant_count = 0,
                drawing_algorithm = 'pg_random'
            WHERE id = r.id;
        ELSE
            -- We have participants. Lock the room.
            UPDATE public.rooms 
            SET state = 'drawing', 
                drawing_started_at = now() 
            WHERE id = r.id;

            actual_winners := 0;

            -- Select winners randomly
            FOR winner_row IN 
                SELECT * FROM public.participants 
                WHERE room_id = r.id 
                ORDER BY random() 
                LIMIT r.total_winners
            LOOP
                actual_winners := actual_winners + 1;
                
                -- Insert winner
                INSERT INTO public.winners (room_id, user_id, selected_number, sequence)
                VALUES (r.id, winner_row.user_id, winner_row.selected_number, actual_winners);
            END LOOP;

            -- Distribute prize pool
            IF actual_winners > 0 THEN
                prize_per_winner := floor(10 / actual_winners);
                IF prize_per_winner > 0 THEN
                    FOR winner_row IN 
                        SELECT user_id FROM public.winners WHERE room_id = r.id
                    LOOP
                        UPDATE public.users 
                        SET credits = credits + prize_per_winner 
                        WHERE id = winner_row.user_id;
                        
                        INSERT INTO public.transactions (user_id, amount, description) 
                        VALUES (winner_row.user_id, prize_per_winner, 'Won Giveaway');
                    END LOOP;
                END IF;
            END IF;

            -- Mark as finished
            UPDATE public.rooms 
            SET state = 'finished',
                drawing_completed_at = now(),
                drawing_participant_count = participant_count,
                drawing_algorithm = 'pg_random'
            WHERE id = r.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cron job to run every minute
-- Note: Requires pg_cron extension to be enabled
SELECT cron.schedule('resolve_expired_rooms_cron', '* * * * *', 'SELECT public.resolve_expired_rooms()');
