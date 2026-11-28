export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_events: {
        Row: {
          created_at: string
          granted: boolean
          id: number
          purpose: string
          relationship_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted: boolean
          id?: never
          purpose: string
          relationship_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: never
          purpose?: string
          relationship_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_events_relationship_id_user_id_fkey"
            columns: ["relationship_id", "user_id"]
            isOneToOne: false
            referencedRelation: "relationship_members"
            referencedColumns: ["relationship_id", "user_id"]
          },
        ]
      }
      contact_labels: {
        Row: {
          contact_id: string
          created_at: string
          label: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          label: string
          owner_id?: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          label?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_labels_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_labels_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_activities: {
        Row: {
          category: string
          closes_at: string
          created_at: string
          generation_source: string
          id: string
          relationship_id: string
          revealed_at: string | null
          sequence_no: number
          theme: string
          title: string
          updated_at: string
          week_start: string
        }
        Insert: {
          category: string
          closes_at: string
          created_at?: string
          generation_source: string
          id?: string
          relationship_id: string
          revealed_at?: string | null
          sequence_no: number
          theme: string
          title: string
          updated_at?: string
          week_start: string
        }
        Update: {
          category?: string
          closes_at?: string
          created_at?: string
          generation_source?: string
          id?: string
          relationship_id?: string
          revealed_at?: string | null
          sequence_no?: number
          theme?: string
          title?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_activities_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_prompts: {
        Row: {
          activity_id: string
          created_at: string
          library_prompt_id: string | null
          prompt_text: string
          relationship_id: string
          swap_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          created_at?: string
          library_prompt_id?: string | null
          prompt_text: string
          relationship_id: string
          swap_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          created_at?: string
          library_prompt_id?: string | null
          prompt_text?: string
          relationship_id?: string
          swap_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_prompts_activity_id_relationship_id_fkey"
            columns: ["activity_id", "relationship_id"]
            isOneToOne: false
            referencedRelation: "discovery_activities"
            referencedColumns: ["id", "relationship_id"]
          },
          {
            foreignKeyName: "discovery_prompts_library_prompt_id_fkey"
            columns: ["library_prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovery_prompts_relationship_id_user_id_fkey"
            columns: ["relationship_id", "user_id"]
            isOneToOne: false
            referencedRelation: "relationship_members"
            referencedColumns: ["relationship_id", "user_id"]
          },
        ]
      }
      discovery_responses: {
        Row: {
          activity_id: string
          body: string | null
          created_at: string
          deleted_at: string | null
          id: string
          media_id: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          media_id?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          media_id?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_responses_activity_id_user_id_fkey"
            columns: ["activity_id", "user_id"]
            isOneToOne: true
            referencedRelation: "discovery_prompts"
            referencedColumns: ["activity_id", "user_id"]
          },
          {
            foreignKeyName: "discovery_responses_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      export_jobs: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          relationship_id: string | null
          requested_by: string
          scope: string
          status: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          relationship_id?: string | null
          requested_by?: string
          scope: string
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          relationship_id?: string | null
          requested_by?: string
          scope?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_jobs_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_jobs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_auto_share: {
        Row: {
          created_at: string
          integration_id: string
          relationship_id: string
        }
        Insert: {
          created_at?: string
          integration_id: string
          relationship_id: string
        }
        Update: {
          created_at?: string
          integration_id?: string
          relationship_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_auto_share_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "user_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_auto_share_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          blurhash: string | null
          bytes: number | null
          created_at: string
          duration_ms: number | null
          height: number | null
          id: string
          kind: string
          mime_type: string | null
          owner_id: string
          status: string
          storage_path: string
          updated_at: string
          waveform: number[] | null
          width: number | null
        }
        Insert: {
          blurhash?: string | null
          bytes?: number | null
          created_at?: string
          duration_ms?: number | null
          height?: number | null
          id?: string
          kind: string
          mime_type?: string | null
          owner_id?: string
          status?: string
          storage_path: string
          updated_at?: string
          waveform?: number[] | null
          width?: number | null
        }
        Update: {
          blurhash?: string | null
          bytes?: number | null
          created_at?: string
          duration_ms?: number | null
          height?: number | null
          id?: string
          kind?: string
          mime_type?: string | null
          owner_id?: string
          status?: string
          storage_path?: string
          updated_at?: string
          waveform?: number[] | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          media_id: string | null
          relationship_id: string
          thread_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          media_id?: string | null
          relationship_id: string
          thread_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          media_id?: string | null
          relationship_id?: string
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_relationship_id_author_id_fkey"
            columns: ["relationship_id", "author_id"]
            isOneToOne: false
            referencedRelation: "relationship_members"
            referencedColumns: ["relationship_id", "user_id"]
          },
          {
            foreignKeyName: "messages_thread_id_relationship_id_fkey"
            columns: ["thread_id", "relationship_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id", "relationship_id"]
          },
        ]
      }
      moment_media: {
        Row: {
          created_at: string
          media_id: string
          moment_id: string
          position: number
        }
        Insert: {
          created_at?: string
          media_id: string
          moment_id: string
          position: number
        }
        Update: {
          created_at?: string
          media_id?: string
          moment_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "moment_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moment_media_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
        ]
      }
      moment_shares: {
        Row: {
          created_at: string
          first_shared_at: string
          moment_id: string
          relationship_id: string
          revoked_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_shared_at?: string
          moment_id: string
          relationship_id: string
          revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_shared_at?: string
          moment_id?: string
          relationship_id?: string
          revoked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moment_shares_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moment_shares_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      moments: {
        Row: {
          author_id: string
          body: string | null
          checkin_date: string | null
          created_at: string
          data: Json
          deleted_at: string | null
          edited_at: string | null
          happened_on: string | null
          happened_precision: string | null
          id: string
          integration_id: string | null
          kind: string
          occurred_at: string | null
          prompt_id: string | null
          prompt_text: string | null
          published_at: string | null
          source: string
          source_event_key: string | null
          status: string
          suggestion_expires_at: string | null
          surface: string
          updated_at: string
        }
        Insert: {
          author_id?: string
          body?: string | null
          checkin_date?: string | null
          created_at?: string
          data?: Json
          deleted_at?: string | null
          edited_at?: string | null
          happened_on?: string | null
          happened_precision?: string | null
          id?: string
          integration_id?: string | null
          kind?: string
          occurred_at?: string | null
          prompt_id?: string | null
          prompt_text?: string | null
          published_at?: string | null
          source?: string
          source_event_key?: string | null
          status?: string
          suggestion_expires_at?: string | null
          surface?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string | null
          checkin_date?: string | null
          created_at?: string
          data?: Json
          deleted_at?: string | null
          edited_at?: string | null
          happened_on?: string | null
          happened_precision?: string | null
          id?: string
          integration_id?: string | null
          kind?: string
          occurred_at?: string | null
          prompt_id?: string | null
          prompt_text?: string | null
          published_at?: string | null
          source?: string
          source_event_key?: string | null
          status?: string
          suggestion_expires_at?: string | null
          surface?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moments_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "user_integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moments_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompt_library"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_recap_views: {
        Row: {
          created_at: string
          recap_month: string
          relationship_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          created_at?: string
          recap_month: string
          relationship_id: string
          user_id?: string
          viewed_at?: string
        }
        Update: {
          created_at?: string
          recap_month?: string
          relationship_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_recap_views_relationship_id_user_id_fkey"
            columns: ["relationship_id", "user_id"]
            isOneToOne: false
            referencedRelation: "relationship_members"
            referencedColumns: ["relationship_id", "user_id"]
          },
        ]
      }
      notification_outbox: {
        Row: {
          actor_id: string | null
          category: string
          created_at: string
          dedupe_key: string | null
          deliver_after: string
          event: string
          id: number
          is_follow_up: boolean
          recipient_id: string
          relationship_id: string | null
          sent_at: string | null
          status: string
          subject_id: string | null
        }
        Insert: {
          actor_id?: string | null
          category: string
          created_at?: string
          dedupe_key?: string | null
          deliver_after?: string
          event: string
          id?: never
          is_follow_up?: boolean
          recipient_id: string
          relationship_id?: string | null
          sent_at?: string | null
          status?: string
          subject_id?: string | null
        }
        Update: {
          actor_id?: string | null
          category?: string
          created_at?: string
          dedupe_key?: string | null
          deliver_after?: string
          event?: string
          id?: never
          is_follow_up?: boolean
          recipient_id?: string
          relationship_id?: string | null
          sent_at?: string | null
          status?: string
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_outbox_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_outbox_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          connections: boolean
          created_at: string
          discover: boolean
          posts_replies: boolean
          quiet_enabled: boolean
          quiet_end: string
          quiet_start: string
          reminder_enabled: boolean
          reminder_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connections?: boolean
          created_at?: string
          discover?: boolean
          posts_replies?: boolean
          quiet_enabled?: boolean
          quiet_end?: string
          quiet_start?: string
          reminder_enabled?: boolean
          reminder_time?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connections?: boolean
          created_at?: string
          discover?: boolean
          posts_replies?: boolean
          quiet_enabled?: boolean
          quiet_end?: string
          quiet_start?: string
          reminder_enabled?: boolean
          reminder_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string | null
          avatar_media_id: string | null
          bird_color: string | null
          bird_extra: string
          bird_seed: number
          created_at: string
          display_name: string
          family_role: string | null
          id: string
          locale: string
          state: string
          state_changed_at: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_media_id?: string | null
          bird_color?: string | null
          bird_extra?: string
          bird_seed?: number
          created_at?: string
          display_name: string
          family_role?: string | null
          id?: string
          locale?: string
          state?: string
          state_changed_at?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_media_id?: string | null
          bird_color?: string | null
          bird_extra?: string
          bird_seed?: number
          created_at?: string
          display_name?: string
          family_role?: string | null
          id?: string
          locale?: string
          state?: string
          state_changed_at?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_avatar_media_fk"
            columns: ["avatar_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_library: {
        Row: {
          active: boolean
          audience_role: string | null
          category: string
          created_at: string
          depth: number
          id: string
          locale: string
          surface: string
          text: string
          topic_tags: string[]
          updated_at: string
        }
        Insert: {
          active?: boolean
          audience_role?: string | null
          category: string
          created_at?: string
          depth?: number
          id?: string
          locale?: string
          surface: string
          text: string
          topic_tags?: string[]
          updated_at?: string
        }
        Update: {
          active?: boolean
          audience_role?: string | null
          category?: string
          created_at?: string
          depth?: number
          id?: string
          locale?: string
          surface?: string
          text?: string
          topic_tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      push_devices: {
        Row: {
          created_at: string
          disabled_at: string | null
          expo_token: string
          id: string
          last_seen_at: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          disabled_at?: string | null
          expo_token: string
          id?: string
          last_seen_at?: string
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          disabled_at?: string | null
          expo_token?: string
          id?: string
          last_seen_at?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string
          reaction: string
          relationship_id: string
          thread_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          reaction: string
          relationship_id: string
          thread_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          reaction?: string
          relationship_id?: string
          thread_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_relationship_id_user_id_fkey"
            columns: ["relationship_id", "user_id"]
            isOneToOne: false
            referencedRelation: "relationship_members"
            referencedColumns: ["relationship_id", "user_id"]
          },
          {
            foreignKeyName: "reactions_thread_id_relationship_id_fkey"
            columns: ["thread_id", "relationship_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id", "relationship_id"]
          },
        ]
      }
      relationship_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          code_hash: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          invitee_label: string
          inviter_role: string
          relationship_id: string | null
          revoked_at: string | null
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          code_hash: string
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          invitee_label: string
          inviter_role: string
          relationship_id?: string | null
          revoked_at?: string | null
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          code_hash?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          invitee_label?: string
          inviter_role?: string
          relationship_id?: string | null
          revoked_at?: string | null
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_invites_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_members: {
        Row: {
          created_at: string
          joined_at: string
          relationship_id: string
          role: string
          updated_at: string
          user_id: string
          withdrawn_at: string | null
        }
        Insert: {
          created_at?: string
          joined_at?: string
          relationship_id: string
          role: string
          updated_at?: string
          user_id: string
          withdrawn_at?: string | null
        }
        Update: {
          created_at?: string
          joined_at?: string
          relationship_id?: string
          role?: string
          updated_at?: string
          user_id?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relationship_members_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_preferences: {
        Row: {
          account_delete_choice: string
          checkin_audience: string
          completed_at: string | null
          connection_goals: string[]
          created_at: string
          curiosity_topics: string[]
          notifications_muted: boolean
          relationship_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_delete_choice?: string
          checkin_audience?: string
          completed_at?: string | null
          connection_goals?: string[]
          created_at?: string
          curiosity_topics?: string[]
          notifications_muted?: boolean
          relationship_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_delete_choice?: string
          checkin_audience?: string
          completed_at?: string | null
          connection_goals?: string[]
          created_at?: string
          curiosity_topics?: string[]
          notifications_muted?: boolean
          relationship_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_preferences_relationship_id_user_id_fkey"
            columns: ["relationship_id", "user_id"]
            isOneToOne: true
            referencedRelation: "relationship_members"
            referencedColumns: ["relationship_id", "user_id"]
          },
        ]
      }
      relationships: {
        Row: {
          activated_at: string
          created_at: string
          ended_mode: string | null
          id: string
          pair_key: string
          reconnect_requested_by: string | null
          status: string
          status_changed_at: string | null
          status_changed_by: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          activated_at?: string
          created_at?: string
          ended_mode?: string | null
          id?: string
          pair_key: string
          reconnect_requested_by?: string | null
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          timezone: string
          updated_at?: string
        }
        Update: {
          activated_at?: string
          created_at?: string
          ended_mode?: string | null
          id?: string
          pair_key?: string
          reconnect_requested_by?: string | null
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationships_reconnect_requested_by_fkey"
            columns: ["reconnect_requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_status_changed_by_fkey"
            columns: ["status_changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_moments: {
        Row: {
          created_at: string
          moment_id: string
          relationship_id: string
          saved_at: string
          saved_by: string
        }
        Insert: {
          created_at?: string
          moment_id: string
          relationship_id: string
          saved_at?: string
          saved_by: string
        }
        Update: {
          created_at?: string
          moment_id?: string
          relationship_id?: string
          saved_at?: string
          saved_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_moments_moment_id_relationship_id_fkey"
            columns: ["moment_id", "relationship_id"]
            isOneToOne: false
            referencedRelation: "moment_shares"
            referencedColumns: ["moment_id", "relationship_id"]
          },
          {
            foreignKeyName: "saved_moments_relationship_id_saved_by_fkey"
            columns: ["relationship_id", "saved_by"]
            isOneToOne: false
            referencedRelation: "relationship_members"
            referencedColumns: ["relationship_id", "user_id"]
          },
        ]
      }
      storage_deletions: {
        Row: {
          bucket_id: string
          created_at: string
          queued_at: string
          storage_path: string
        }
        Insert: {
          bucket_id?: string
          created_at?: string
          queued_at?: string
          storage_path: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          queued_at?: string
          storage_path?: string
        }
        Relationships: []
      }
      thread_reads: {
        Row: {
          created_at: string
          last_read_at: string
          relationship_id: string
          thread_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          last_read_at?: string
          relationship_id: string
          thread_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          last_read_at?: string
          relationship_id?: string
          thread_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_reads_relationship_id_user_id_fkey"
            columns: ["relationship_id", "user_id"]
            isOneToOne: false
            referencedRelation: "relationship_members"
            referencedColumns: ["relationship_id", "user_id"]
          },
          {
            foreignKeyName: "thread_reads_thread_id_relationship_id_fkey"
            columns: ["thread_id", "relationship_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id", "relationship_id"]
          },
        ]
      }
      threads: {
        Row: {
          created_at: string
          discovery_activity_id: string | null
          id: string
          moment_id: string | null
          relationship_id: string
        }
        Insert: {
          created_at?: string
          discovery_activity_id?: string | null
          id?: string
          moment_id?: string | null
          relationship_id: string
        }
        Update: {
          created_at?: string
          discovery_activity_id?: string | null
          id?: string
          moment_id?: string | null
          relationship_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_discovery_activity_id_relationship_id_fkey"
            columns: ["discovery_activity_id", "relationship_id"]
            isOneToOne: false
            referencedRelation: "discovery_activities"
            referencedColumns: ["id", "relationship_id"]
          },
          {
            foreignKeyName: "threads_moment_id_relationship_id_fkey"
            columns: ["moment_id", "relationship_id"]
            isOneToOne: false
            referencedRelation: "moment_shares"
            referencedColumns: ["moment_id", "relationship_id"]
          },
          {
            foreignKeyName: "threads_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      user_integrations: {
        Row: {
          connection_version: number
          created_at: string
          granted_scopes: string[]
          id: string
          import_after: string
          last_error_code: string | null
          last_synced_at: string | null
          next_sync_at: string | null
          provider: string
          provider_account_id: string | null
          share_mode: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connection_version?: number
          created_at?: string
          granted_scopes?: string[]
          id?: string
          import_after?: string
          last_error_code?: string | null
          last_synced_at?: string | null
          next_sync_at?: string | null
          provider: string
          provider_account_id?: string | null
          share_mode?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connection_version?: number
          created_at?: string
          granted_scopes?: string[]
          id?: string
          import_after?: string
          last_error_code?: string | null
          last_synced_at?: string | null
          next_sync_at?: string | null
          provider?: string
          provider_account_id?: string | null
          share_mode?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          avoid_phrases: string[]
          avoid_topics: string[]
          completed_at: string | null
          created_at: string
          interests: string[]
          life_stage: string | null
          question_depth: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avoid_phrases?: string[]
          avoid_topics?: string[]
          completed_at?: string | null
          created_at?: string
          interests?: string[]
          life_stage?: string | null
          question_depth?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          avoid_phrases?: string[]
          avoid_topics?: string[]
          completed_at?: string | null
          created_at?: string
          interests?: string[]
          life_stage?: string | null
          question_depth?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      current_consent: {
        Row: {
          created_at: string | null
          granted: boolean | null
          purpose: string | null
          relationship_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_events_relationship_id_user_id_fkey"
            columns: ["relationship_id", "user_id"]
            isOneToOne: false
            referencedRelation: "relationship_members"
            referencedColumns: ["relationship_id", "user_id"]
          },
        ]
      }
    }
    Functions: {
      accept_invite: {
        Args: { p_label?: string; p_secret: string }
        Returns: string
      }
      add_share: {
        Args: {
          p_author_id: string
          p_moment_id: string
          p_relationship_id: string
        }
        Returns: undefined
      }
      answer_checkin: {
        Args: {
          p_body?: string
          p_data?: Json
          p_prompt_id: string
          p_relationship_ids?: string[]
        }
        Returns: string
      }
      app_uid: { Args: never; Returns: string }
      archive_items: {
        Args: {
          p_category?: string
          p_from?: string
          p_item_type?: string
          p_relationship_id: string
          p_to?: string
        }
        Returns: {
          author_id: string
          body: string
          category: string
          happened_on: string
          happened_precision: string
          item_id: string
          item_type: string
          kind: string
          saved_by: string[]
          shared_at: string
          sort_date: string
          thread_id: string
          title: string
        }[]
      }
      can_read_discovery_response: {
        Args: { p_response_id: string }
        Returns: boolean
      }
      can_read_media_path: { Args: { p_path: string }; Returns: boolean }
      can_read_moment: { Args: { p_moment_id: string }; Returns: boolean }
      can_read_share: {
        Args: { p_moment_id: string; p_relationship_id: string }
        Returns: boolean
      }
      can_read_thread: { Args: { p_thread_id: string }; Returns: boolean }
      cancel_account_deletion: { Args: never; Returns: undefined }
      checkin_prompts: {
        Args: { p_date?: string }
        Returns: {
          active: boolean
          audience_role: string | null
          category: string
          created_at: string
          depth: number
          id: string
          locale: string
          surface: string
          text: string
          topic_tags: string[]
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "prompt_library"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_notifications: {
        Args: { p_limit?: number }
        Returns: {
          actor_id: string
          category: string
          event: string
          expo_tokens: string[]
          is_follow_up: boolean
          item_count: number
          recipient_id: string
          relationship_id: string
          sender_label: string
          subject_id: string
        }[]
      }
      connect_health_integration: { Args: never; Returns: string }
      connect_integration_for: {
        Args: {
          p_account_id?: string
          p_provider: string
          p_scopes?: string[]
          p_user_id: string
        }
        Returns: string
      }
      create_connector_moment: {
        Args: {
          p_body: string
          p_data: Json
          p_event_key: string
          p_integration: Database["public"]["Tables"]["user_integrations"]["Row"]
          p_occurred_at: string
        }
        Returns: string
      }
      create_invite: {
        Args: { p_invitee_label: string; p_inviter_role: string }
        Returns: {
          code: string
          expires_at: string
          invite_id: string
          token: string
        }[]
      }
      date_matches_precision: {
        Args: { p_date: string; p_precision: string }
        Returns: boolean
      }
      disable_push_tokens: { Args: { p_tokens: string[] }; Returns: number }
      disconnect_integration: {
        Args: { p_provider: string }
        Returns: undefined
      }
      discovery_category_depth: {
        Args: { p_category: string }
        Returns: number
      }
      discovery_category_theme: {
        Args: { p_category: string }
        Returns: string
      }
      discovery_category_title: {
        Args: { p_category: string }
        Returns: string
      }
      discovery_partner_submitted: {
        Args: { p_activity_id: string }
        Returns: boolean
      }
      dismiss_suggestion: { Args: { p_moment_id: string }; Returns: undefined }
      due_integration_syncs: {
        Args: { p_limit?: number }
        Returns: {
          connection_version: number
          import_after: string
          integration_id: string
          last_synced_at: string
          user_id: string
        }[]
      }
      end_relationship: {
        Args: {
          p_block?: boolean
          p_relationship_id: string
          p_withdraw?: boolean
        }
        Returns: string
      }
      enqueue_checkin_reminders: { Args: never; Returns: number }
      enqueue_discover_closing: { Args: never; Returns: number }
      enqueue_notification: {
        Args: {
          p_actor_id: string
          p_category: string
          p_dedupe_key?: string
          p_event: string
          p_recipient_id: string
          p_relationship_id: string
          p_subject_id: string
        }
        Returns: number
      }
      finalize_account_deletions: {
        Args: never
        Returns: {
          auth_user_id: string
          profile_id: string
        }[]
      }
      home_feed: {
        Args: {
          p_before?: string
          p_limit?: number
          p_relationship_ids?: string[]
        }
        Returns: {
          author_id: string
          body: string
          data: Json
          edited_at: string
          happened_on: string
          happened_precision: string
          kind: string
          latest_shared_at: string
          media: Json
          moment_id: string
          published_at: string
          shares: Json
          source: string
        }[]
      }
      in_relationship: { Args: { p_relationship_id: string }; Returns: boolean }
      ingest_connector_event: {
        Args: {
          p_body?: string
          p_connection_version: number
          p_data?: Json
          p_event_key: string
          p_integration_id: string
          p_occurred_at: string
        }
        Returns: string
      }
      invite_hash: { Args: { p_secret: string }; Returns: string }
      is_active_member: {
        Args: { p_relationship_id: string }
        Returns: boolean
      }
      is_connected_to: { Args: { p_profile_id: string }; Returns: boolean }
      is_member: { Args: { p_relationship_id: string }; Returns: boolean }
      is_valid_timezone: { Args: { tz: string }; Returns: boolean }
      media_in_use: { Args: { p_media_id: string }; Returns: boolean }
      memorialize_profile: {
        Args: { p_profile_id: string }
        Returns: undefined
      }
      moment_data_valid: {
        Args: { p_data: Json; p_kind: string }
        Returns: boolean
      }
      monthly_recap: {
        Args: { p_month: string; p_relationship_id: string }
        Returns: Json
      }
      my_trash: {
        Args: never
        Returns: {
          deleted_at: string
          item_id: string
          item_type: string
          preview: string
          purge_after: string
        }[]
      }
      next_discovery_category: {
        Args: { p_relationship_id: string }
        Returns: string
      }
      open_discovery_week: {
        Args: {
          p_category: string
          p_prompts?: Json
          p_relationship_id: string
          p_source: string
          p_theme?: string
          p_title?: string
        }
        Returns: string
      }
      other_member: {
        Args: { p_relationship_id: string; p_user_id: string }
        Returns: string
      }
      pair_avoid_topics: {
        Args: { p_relationship_id: string }
        Returns: string[]
      }
      pair_key: { Args: { a: string; b: string }; Returns: string }
      pair_question_depth: {
        Args: { p_relationship_id: string }
        Returns: number
      }
      pause_relationship: {
        Args: { p_relationship_id: string }
        Returns: undefined
      }
      pick_discovery_prompt: {
        Args: {
          p_category: string
          p_exclude_text?: string
          p_relationship_id: string
          p_user_id: string
        }
        Returns: {
          prompt_id: string
          prompt_text: string
        }[]
      }
      publish_moment: {
        Args: { p_moment_id: string; p_relationship_ids?: string[] }
        Returns: string
      }
      purge_trash: { Args: never; Returns: number }
      read_integration_tokens: {
        Args: { p_integration_id: string }
        Returns: {
          access_token_ciphertext: string
          connection_version: number
          expires_at: string
          refresh_token_ciphertext: string
        }[]
      }
      reconnect_relationship: {
        Args: { p_accept?: boolean; p_relationship_id: string }
        Returns: string
      }
      record_integration_sync: {
        Args: {
          p_connection_version: number
          p_error_code?: string
          p_integration_id: string
          p_needs_reauth?: boolean
          p_next_sync_at: string
        }
        Returns: undefined
      }
      register_push_device: {
        Args: { p_expo_token: string; p_platform: string }
        Returns: string
      }
      request_account_deletion: {
        Args: { p_leave_archive?: string[] }
        Returns: string
      }
      restore_discovery_response: {
        Args: { p_activity_id: string }
        Returns: undefined
      }
      restore_moment: { Args: { p_moment_id: string }; Returns: undefined }
      revoke_invite: { Args: { p_invite_id: string }; Returns: undefined }
      save_discovery_activity: {
        Args: {
          p_category: string
          p_prompts: Json
          p_relationship_id: string
          p_theme: string
          p_title: string
        }
        Returns: string
      }
      save_moment: {
        Args: { p_moment_id: string; p_relationship_id: string }
        Returns: undefined
      }
      service_connect_integration: {
        Args: {
          p_access: string
          p_account_id: string
          p_expires_at: string
          p_provider: string
          p_refresh: string
          p_scopes: string[]
          p_user_id: string
        }
        Returns: string
      }
      set_integration_sharing: {
        Args: {
          p_mode: string
          p_provider: string
          p_relationship_ids?: string[]
        }
        Returns: undefined
      }
      set_relationship_timezone: {
        Args: { p_relationship_id: string; p_timezone: string }
        Returns: undefined
      }
      start_discovery_week: {
        Args: { p_relationship_id: string }
        Returns: string
      }
      start_discovery_weeks: { Args: never; Returns: number }
      store_integration_tokens: {
        Args: {
          p_access: string
          p_expires_at: string
          p_integration_id: string
          p_refresh: string
        }
        Returns: undefined
      }
      submit_discovery_response: {
        Args: {
          p_activity_id: string
          p_body?: string
          p_media_id?: string
          p_submit?: boolean
        }
        Returns: string
      }
      submit_health_summary: {
        Args: { p_body?: string; p_data?: Json; p_day: string }
        Returns: string
      }
      swap_discovery_prompt: {
        Args: { p_activity_id: string }
        Returns: string
      }
      trash_discovery_response: {
        Args: { p_activity_id: string }
        Returns: undefined
      }
      trash_moment: { Args: { p_moment_id: string }; Returns: undefined }
      unregister_push_device: {
        Args: { p_expo_token: string }
        Returns: undefined
      }
      unsave_moment: {
        Args: { p_moment_id: string; p_relationship_id: string }
        Returns: undefined
      }
      unshare_moment: {
        Args: { p_moment_id: string; p_relationship_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
