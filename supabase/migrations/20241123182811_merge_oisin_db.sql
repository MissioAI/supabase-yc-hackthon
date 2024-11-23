create table "public"."conversation_messages" (
    "id" uuid not null default gen_random_uuid(),
    "conversation_id" uuid,
    "role" text not null,
    "content" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
);
create table "public"."conversations" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid not null,
    "title" text not null,
    "last_message" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);
create table "public"."tasks" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "title" text not null,
    "description" text,
    "status" text default 'pending'::text,
    "priority" text default 'medium'::text,
    "due_date" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "search_vector" tsvector generated always as (
        (
            setweight(
                to_tsvector('english'::regconfig, COALESCE(title, ''::text)),
                'A'::"char"
            ) || setweight(
                to_tsvector(
                    'english'::regconfig,
                    COALESCE(description, ''::text)
                ),
                'B'::"char"
            )
        )
    ) stored
);
alter table "public"."tasks" enable row level security;
CREATE UNIQUE INDEX conversation_messages_pkey ON public.conversation_messages USING btree (id);
CREATE UNIQUE INDEX conversations_pkey ON public.conversations USING btree (id);
CREATE UNIQUE INDEX tasks_pkey ON public.tasks USING btree (id);
CREATE INDEX tasks_search_idx ON public.tasks USING gin (search_vector);
alter table "public"."conversation_messages"
add constraint "conversation_messages_pkey" PRIMARY KEY using index "conversation_messages_pkey";
alter table "public"."conversations"
add constraint "conversations_pkey" PRIMARY KEY using index "conversations_pkey";
alter table "public"."tasks"
add constraint "tasks_pkey" PRIMARY KEY using index "tasks_pkey";
alter table "public"."conversation_messages"
add constraint "conversation_messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE not valid;
alter table "public"."conversation_messages" validate constraint "conversation_messages_conversation_id_fkey";
alter table "public"."conversation_messages"
add constraint "conversation_messages_role_check" CHECK (
        (
            role = ANY (ARRAY ['user'::text, 'assistant'::text])
        )
    ) not valid;
alter table "public"."conversation_messages" validate constraint "conversation_messages_role_check";
alter table "public"."conversations"
add constraint "conversations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;
alter table "public"."conversations" validate constraint "conversations_user_id_fkey";
alter table "public"."tasks"
add constraint "tasks_priority_check" CHECK (
        (
            priority = ANY (
                ARRAY ['low'::text, 'medium'::text, 'high'::text]
            )
        )
    ) not valid;
alter table "public"."tasks" validate constraint "tasks_priority_check";
alter table "public"."tasks"
add constraint "tasks_status_check" CHECK (
        (
            status = ANY (
                ARRAY ['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]
            )
        )
    ) not valid;
alter table "public"."tasks" validate constraint "tasks_status_check";
alter table "public"."tasks"
add constraint "tasks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;
alter table "public"."tasks" validate constraint "tasks_user_id_fkey";
set check_function_bodies = off;
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS trigger LANGUAGE plpgsql AS $function$ begin new.updated_at = now();
return new;
end;
$function$;
grant delete on table "public"."conversation_messages" to "anon";
grant insert on table "public"."conversation_messages" to "anon";
grant references on table "public"."conversation_messages" to "anon";
grant select on table "public"."conversation_messages" to "anon";
grant trigger on table "public"."conversation_messages" to "anon";
grant truncate on table "public"."conversation_messages" to "anon";
grant update on table "public"."conversation_messages" to "anon";
grant delete on table "public"."conversation_messages" to "authenticated";
grant insert on table "public"."conversation_messages" to "authenticated";
grant references on table "public"."conversation_messages" to "authenticated";
grant select on table "public"."conversation_messages" to "authenticated";
grant trigger on table "public"."conversation_messages" to "authenticated";
grant truncate on table "public"."conversation_messages" to "authenticated";
grant update on table "public"."conversation_messages" to "authenticated";
grant delete on table "public"."conversation_messages" to "service_role";
grant insert on table "public"."conversation_messages" to "service_role";
grant references on table "public"."conversation_messages" to "service_role";
grant select on table "public"."conversation_messages" to "service_role";
grant trigger on table "public"."conversation_messages" to "service_role";
grant truncate on table "public"."conversation_messages" to "service_role";
grant update on table "public"."conversation_messages" to "service_role";
grant delete on table "public"."conversations" to "anon";
grant insert on table "public"."conversations" to "anon";
grant references on table "public"."conversations" to "anon";
grant select on table "public"."conversations" to "anon";
grant trigger on table "public"."conversations" to "anon";
grant truncate on table "public"."conversations" to "anon";
grant update on table "public"."conversations" to "anon";
grant delete on table "public"."conversations" to "authenticated";
grant insert on table "public"."conversations" to "authenticated";
grant references on table "public"."conversations" to "authenticated";
grant select on table "public"."conversations" to "authenticated";
grant trigger on table "public"."conversations" to "authenticated";
grant truncate on table "public"."conversations" to "authenticated";
grant update on table "public"."conversations" to "authenticated";
grant delete on table "public"."conversations" to "service_role";
grant insert on table "public"."conversations" to "service_role";
grant references on table "public"."conversations" to "service_role";
grant select on table "public"."conversations" to "service_role";
grant trigger on table "public"."conversations" to "service_role";
grant truncate on table "public"."conversations" to "service_role";
grant update on table "public"."conversations" to "service_role";
grant delete on table "public"."tasks" to "anon";
grant insert on table "public"."tasks" to "anon";
grant references on table "public"."tasks" to "anon";
grant select on table "public"."tasks" to "anon";
grant trigger on table "public"."tasks" to "anon";
grant truncate on table "public"."tasks" to "anon";
grant update on table "public"."tasks" to "anon";
grant delete on table "public"."tasks" to "authenticated";
grant insert on table "public"."tasks" to "authenticated";
grant references on table "public"."tasks" to "authenticated";
grant select on table "public"."tasks" to "authenticated";
grant trigger on table "public"."tasks" to "authenticated";
grant truncate on table "public"."tasks" to "authenticated";
grant update on table "public"."tasks" to "authenticated";
grant delete on table "public"."tasks" to "service_role";
grant insert on table "public"."tasks" to "service_role";
grant references on table "public"."tasks" to "service_role";
grant select on table "public"."tasks" to "service_role";
grant trigger on table "public"."tasks" to "service_role";
grant truncate on table "public"."tasks" to "service_role";
grant update on table "public"."tasks" to "service_role";
create policy "Users can view their own conversations" on "public"."conversations" as permissive for
select to public using ((auth.uid() = user_id));
create policy "Users can only see their own tasks" on "public"."tasks" as permissive for all to public using ((auth.uid() = user_id));
create policy "Users can view their own tasks in realtime" on "public"."tasks" as permissive for
select to public using ((auth.uid() = user_id));
CREATE TRIGGER on_tasks_updated BEFORE
UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION handle_updated_at();