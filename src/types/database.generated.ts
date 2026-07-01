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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      birthday_auto_posts: {
        Row: {
          created_at: string
          id: string
          member_id: string
          post_id: string | null
          posted_for_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          post_id?: string | null
          posted_for_date: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          post_id?: string | null
          posted_for_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "birthday_auto_posts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "birthday_auto_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          title: string
          type: Database["public"]["Enums"]["chat_type"]
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          title: string
          type: Database["public"]["Enums"]["chat_type"]
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          title?: string
          type?: Database["public"]["Enums"]["chat_type"]
        }
        Relationships: [
          {
            foreignKeyName: "chats_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          checked_in: boolean
          checked_in_at: string | null
          checkin_latitude: number | null
          checkin_longitude: number | null
          created_at: string
          event_id: string
          id: string
          status: Database["public"]["Enums"]["rsvp_status"]
          user_id: string
        }
        Insert: {
          checked_in?: boolean
          checked_in_at?: string | null
          checkin_latitude?: number | null
          checkin_longitude?: number | null
          created_at?: string
          event_id: string
          id?: string
          status?: Database["public"]["Enums"]["rsvp_status"]
          user_id: string
        }
        Update: {
          checked_in?: boolean
          checked_in_at?: string | null
          checkin_latitude?: number | null
          checkin_longitude?: number | null
          created_at?: string
          event_id?: string
          id?: string
          status?: Database["public"]["Enums"]["rsvp_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          created_at: string
          created_by_user_id: string
          description: string | null
          end_time: string | null
          event_date: string
          id: string
          image_url: string | null
          kind: Database["public"]["Enums"]["event_kind"]
          latitude: number | null
          location_name: string | null
          longitude: number | null
          start_time: string | null
          status: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by_user_id: string
          description?: string | null
          end_time?: string | null
          event_date: string
          id?: string
          image_url?: string | null
          kind?: Database["public"]["Enums"]["event_kind"]
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by_user_id?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          id?: string
          image_url?: string | null
          kind?: Database["public"]["Enums"]["event_kind"]
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          muted: boolean
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          muted?: boolean
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          muted?: boolean
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          category: Database["public"]["Enums"]["group_category"]
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_private: boolean
          kind: Database["public"]["Enums"]["group_kind"]
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["group_category"]
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_private?: boolean
          kind?: Database["public"]["Enums"]["group_kind"]
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["group_category"]
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_private?: boolean
          kind?: Database["public"]["Enums"]["group_kind"]
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          approved_at: string | null
          created_at: string
          created_by_user_id: string
          id: string
          invite_code: string
          status: string
          used_by_user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          created_by_user_id: string
          id?: string
          invite_code: string
          status?: string
          used_by_user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          created_by_user_id?: string
          id?: string
          invite_code?: string
          status?: string
          used_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_used_by_user_id_fkey"
            columns: ["used_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetup_rsvps: {
        Row: {
          checked_in: boolean
          checked_in_at: string | null
          checkin_latitude: number | null
          checkin_longitude: number | null
          created_at: string
          going: boolean
          id: string
          meetup_id: string
          user_id: string
        }
        Insert: {
          checked_in?: boolean
          checked_in_at?: string | null
          checkin_latitude?: number | null
          checkin_longitude?: number | null
          created_at?: string
          going?: boolean
          id?: string
          meetup_id: string
          user_id: string
        }
        Update: {
          checked_in?: boolean
          checked_in_at?: string | null
          checkin_latitude?: number | null
          checkin_longitude?: number | null
          created_at?: string
          going?: boolean
          id?: string
          meetup_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetup_rsvps_meetup_id_fkey"
            columns: ["meetup_id"]
            isOneToOne: false
            referencedRelation: "meetups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetup_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetups: {
        Row: {
          address: string | null
          category: Database["public"]["Enums"]["meetup_category"]
          created_at: string
          duration_min: number
          host_user_id: string
          id: string
          latitude: number | null
          location_name: string | null
          longitude: number | null
          notes: string | null
          title: string
          updated_at: string
          when_at: string
        }
        Insert: {
          address?: string | null
          category?: Database["public"]["Enums"]["meetup_category"]
          created_at?: string
          duration_min?: number
          host_user_id: string
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          notes?: string | null
          title: string
          updated_at?: string
          when_at: string
        }
        Update: {
          address?: string | null
          category?: Database["public"]["Enums"]["meetup_category"]
          created_at?: string
          duration_min?: number
          host_user_id?: string
          id?: string
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          notes?: string | null
          title?: string
          updated_at?: string
          when_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetups_host_user_id_fkey"
            columns: ["host_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          chat_id: string
          content: string | null
          created_at: string
          deleted_at: string | null
          id: string
          media_type: Database["public"]["Enums"]["media_type"]
          media_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_id: string
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          media_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          content?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          media_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partnerships: {
        Row: {
          active: boolean
          address: string | null
          blurb: string | null
          created_at: string
          discount_details: string
          id: string
          link_url: string | null
          location_name: string | null
          logo_url: string | null
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          blurb?: string | null
          created_at?: string
          discount_details: string
          id?: string
          link_url?: string | null
          location_name?: string | null
          logo_url?: string | null
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          blurb?: string | null
          created_at?: string
          discount_details?: string
          id?: string
          link_url?: string | null
          location_name?: string | null
          logo_url?: string | null
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      points_ledger: {
        Row: {
          action_type: string
          created_at: string
          id: string
          points: number
          related_entity_id: string | null
          related_entity_type: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          points: number
          related_entity_id?: string | null
          related_entity_type?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          points?: number
          related_entity_id?: string | null
          related_entity_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          option_text: string
          poll_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_text: string
          poll_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_text?: string
          poll_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          poll_id: string
          poll_option_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          poll_id: string
          poll_option_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          poll_id?: string
          poll_option_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_option_id_fkey"
            columns: ["poll_option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          chat_id: string | null
          closes_at: string | null
          created_at: string
          created_by_user_id: string
          event_id: string | null
          id: string
          question: string
        }
        Insert: {
          chat_id?: string | null
          closes_at?: string | null
          created_at?: string
          created_by_user_id: string
          event_id?: string | null
          id?: string
          question: string
        }
        Update: {
          chat_id?: string | null
          closes_at?: string | null
          created_at?: string
          created_by_user_id?: string
          event_id?: string | null
          id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_mentions: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          mentioned_user_id: string
          post_id: string | null
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          mentioned_user_id: string
          post_id?: string | null
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          mentioned_user_id?: string
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_mentions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          kind: Database["public"]["Enums"]["post_kind"]
          media_type: Database["public"]["Enums"]["media_type"]
          media_url: string | null
          meetup_location: string | null
          meetup_when_at: string | null
          pinned: boolean
          poll_options: string[] | null
          poll_question: string | null
          tagged_event_id: string | null
          tagged_group_id: string | null
          tagged_meetup_id: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["post_kind"]
          media_type?: Database["public"]["Enums"]["media_type"]
          media_url?: string | null
          meetup_location?: string | null
          meetup_when_at?: string | null
          pinned?: boolean
          poll_options?: string[] | null
          poll_question?: string | null
          tagged_event_id?: string | null
          tagged_group_id?: string | null
          tagged_meetup_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["post_kind"]
          media_type?: Database["public"]["Enums"]["media_type"]
          media_url?: string | null
          meetup_location?: string | null
          meetup_when_at?: string | null
          pinned?: boolean
          poll_options?: string[] | null
          poll_question?: string | null
          tagged_event_id?: string | null
          tagged_group_id?: string | null
          tagged_meetup_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_tagged_event_id_fkey"
            columns: ["tagged_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_tagged_group_id_fkey"
            columns: ["tagged_group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_tagged_meetup_id_fkey"
            columns: ["tagged_meetup_id"]
            isOneToOne: false
            referencedRelation: "meetups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string
          bio: string | null
          birthday: string | null
          cashapp_username: string | null
          company: string | null
          created_at: string
          deleted_at: string | null
          disclaimer_accepted_at: string | null
          email: string
          full_name: string
          id: string
          instagram_url: string | null
          interests: string[] | null
          invite_code: string
          invited_by_user_id: string | null
          kids: string | null
          last_active_at: string | null
          membership_date: string | null
          occupation: string | null
          phone: string | null
          points_total: number
          profile_photo_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          spouse: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          username: string | null
          venmo_username: string | null
        }
        Insert: {
          auth_user_id: string
          bio?: string | null
          birthday?: string | null
          cashapp_username?: string | null
          company?: string | null
          created_at?: string
          deleted_at?: string | null
          disclaimer_accepted_at?: string | null
          email: string
          full_name: string
          id?: string
          instagram_url?: string | null
          interests?: string[] | null
          invite_code?: string
          invited_by_user_id?: string | null
          kids?: string | null
          last_active_at?: string | null
          membership_date?: string | null
          occupation?: string | null
          phone?: string | null
          points_total?: number
          profile_photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          spouse?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          username?: string | null
          venmo_username?: string | null
        }
        Update: {
          auth_user_id?: string
          bio?: string | null
          birthday?: string | null
          cashapp_username?: string | null
          company?: string | null
          created_at?: string
          deleted_at?: string | null
          disclaimer_accepted_at?: string | null
          email?: string
          full_name?: string
          id?: string
          instagram_url?: string | null
          interests?: string[] | null
          invite_code?: string
          invited_by_user_id?: string | null
          kids?: string | null
          last_active_at?: string | null
          membership_date?: string | null
          occupation?: string | null
          phone?: string | null
          points_total?: number
          profile_photo_url?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          spouse?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
          username?: string | null
          venmo_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_invited_by_user_id_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          device_token: string | null
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          platform: Database["public"]["Enums"]["push_platform"]
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          device_token?: string | null
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          platform?: Database["public"]["Enums"]["push_platform"]
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          device_token?: string | null
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          platform?: Database["public"]["Enums"]["push_platform"]
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          action_taken: string | null
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_comment_id: string | null
          target_message_id: string | null
          target_post_id: string | null
          target_thread_message_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_comment_id?: string | null
          target_message_id?: string | null
          target_post_id?: string | null
          target_thread_message_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_comment_id?: string | null
          target_message_id?: string | null
          target_post_id?: string | null
          target_thread_message_id?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_target_comment_id_fkey"
            columns: ["target_comment_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_target_message_id_fkey"
            columns: ["target_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_target_post_id_fkey"
            columns: ["target_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_target_thread_message_id_fkey"
            columns: ["target_thread_message_id"]
            isOneToOne: false
            referencedRelation: "thread_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          shopify_url: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          shopify_url?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          shopify_url?: string | null
        }
        Relationships: []
      }
      thread_members: {
        Row: {
          joined_at: string
          last_read_at: string | null
          muted: boolean
          thread_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          last_read_at?: string | null
          muted?: boolean
          thread_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          last_read_at?: string | null
          muted?: boolean
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_members_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      thread_messages: {
        Row: {
          author_id: string
          body: string | null
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          media_type: Database["public"]["Enums"]["media_type"]
          media_url: string | null
          ref_id: string | null
          ref_kind: string | null
          reply_to_id: string | null
          thread_id: string
        }
        Insert: {
          author_id: string
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          media_url?: string | null
          ref_id?: string | null
          ref_kind?: string | null
          reply_to_id?: string | null
          thread_id: string
        }
        Update: {
          author_id?: string
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          media_url?: string | null
          ref_id?: string | null
          ref_kind?: string | null
          reply_to_id?: string | null
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "thread_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          created_at: string
          dm_pair_key: string | null
          event_id: string | null
          group_id: string | null
          id: string
          kind: Database["public"]["Enums"]["thread_kind"]
          last_message_at: string | null
          last_message_preview: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          dm_pair_key?: string | null
          event_id?: string | null
          group_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["thread_kind"]
          last_message_at?: string | null
          last_message_preview?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          dm_pair_key?: string | null
          event_id?: string | null
          group_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["thread_kind"]
          last_message_at?: string | null
          last_message_preview?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "threads_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "threads_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_profile: {
        Args: { p_profile_id: string }
        Returns: {
          auth_user_id: string
          bio: string | null
          birthday: string | null
          cashapp_username: string | null
          company: string | null
          created_at: string
          deleted_at: string | null
          disclaimer_accepted_at: string | null
          email: string
          full_name: string
          id: string
          instagram_url: string | null
          interests: string[] | null
          invite_code: string
          invited_by_user_id: string | null
          kids: string | null
          last_active_at: string | null
          membership_date: string | null
          occupation: string | null
          phone: string | null
          points_total: number
          profile_photo_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          spouse: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          username: string | null
          venmo_username: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      approve_member: {
        Args: { p_target_profile_id: string }
        Returns: undefined
      }
      award_points: {
        Args: {
          p_action_type: string
          p_daily_cap?: number
          p_points: number
          p_related_entity_id?: string
          p_related_entity_type?: string
          p_user_id: string
        }
        Returns: undefined
      }
      award_points_rpc: {
        Args: {
          p_action: string
          p_points: number
          p_related_id?: string
          p_related_type?: string
          p_user_id: string
        }
        Returns: undefined
      }
      birthdays_today: {
        Args: never
        Returns: {
          full_name: string
          id: string
          profile_photo_url: string
        }[]
      }
      book_birthday_auto_post: {
        Args: { p_member_id: string }
        Returns: string
      }
      can_see_chat: { Args: { p_chat_id: string }; Returns: boolean }
      check_in_event: {
        Args: { p_event_id: string; p_latitude: number; p_longitude: number }
        Returns: undefined
      }
      check_in_meetup: {
        Args: { p_latitude: number; p_longitude: number; p_meetup_id: string }
        Returns: undefined
      }
      current_profile_id: { Args: never; Returns: string }
      current_profile_role: { Args: never; Returns: string }
      current_profile_status: { Args: never; Returns: string }
      event_going_counts: {
        Args: { p_event_ids: string[] }
        Returns: {
          event_id: string
          going_count: number
        }[]
      }
      find_or_create_dm: {
        Args: { p_other_profile_id: string }
        Returns: string
      }
      generate_unique_username: {
        Args: { p_email: string; p_exclude?: string; p_full_name: string }
        Returns: string
      }
      get_invite_inviter: {
        Args: { p_invite_code: string }
        Returns: {
          full_name: string
          id: string
          occupation: string
          profile_photo_url: string
          status: Database["public"]["Enums"]["user_status"]
        }[]
      }
      get_my_blocked_profiles: {
        Args: never
        Returns: {
          block_id: string
          blocked_at: string
          blocked_id: string
          full_name: string
          profile_photo_url: string
        }[]
      }
      get_my_blocked_usernames: {
        Args: never
        Returns: {
          username: string
        }[]
      }
      group_member_counts: {
        Args: { p_group_ids: string[] }
        Returns: {
          group_id: string
          member_count: number
        }[]
      }
      home_feed_stats: {
        Args: { p_post_ids: string[]; p_viewer_id: string }
        Returns: {
          comment_count: number
          like_count: number
          my_liked: boolean
          my_poll_vote: number
          poll_vote_counts: Json
          post_id: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_approved: { Args: never; Returns: boolean }
      is_author_visible: { Args: { p_author: string }; Returns: boolean }
      is_birthday_today: { Args: { p_profile_id: string }; Returns: boolean }
      is_blocked_either_way: {
        Args: { p_other_profile_id: string }
        Returns: boolean
      }
      is_group_member: { Args: { p_group_id: string }; Returns: boolean }
      is_thread_member: { Args: { p_thread_id: string }; Returns: boolean }
      me_full: {
        Args: never
        Returns: {
          auth_user_id: string
          bio: string | null
          birthday: string | null
          cashapp_username: string | null
          company: string | null
          created_at: string
          deleted_at: string | null
          disclaimer_accepted_at: string | null
          email: string
          full_name: string
          id: string
          instagram_url: string | null
          interests: string[] | null
          invite_code: string
          invited_by_user_id: string | null
          kids: string | null
          last_active_at: string | null
          membership_date: string | null
          occupation: string | null
          phone: string | null
          points_total: number
          profile_photo_url: string | null
          role: Database["public"]["Enums"]["user_role"]
          spouse: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
          username: string | null
          venmo_username: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      meetup_going_counts: {
        Args: { p_meetup_ids: string[] }
        Returns: {
          going_count: number
          meetup_id: string
        }[]
      }
      my_event_rsvp: {
        Args: { p_event_id: string }
        Returns: {
          checked_in: boolean
          checked_in_at: string | null
          checkin_latitude: number | null
          checkin_longitude: number | null
          created_at: string
          event_id: string
          id: string
          status: Database["public"]["Enums"]["rsvp_status"]
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "event_rsvps"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      reject_member: {
        Args: { p_target_profile_id: string }
        Returns: undefined
      }
      rsvp_event: {
        Args: {
          p_event_id: string
          p_status?: Database["public"]["Enums"]["rsvp_status"]
        }
        Returns: undefined
      }
      rsvp_meetup: {
        Args: { p_going?: boolean; p_meetup_id: string }
        Returns: undefined
      }
      set_role: {
        Args: {
          p_new_role: Database["public"]["Enums"]["user_role"]
          p_target_profile_id: string
        }
        Returns: undefined
      }
      soft_delete_self_profile: { Args: never; Returns: undefined }
      watchmen_member_number: {
        Args: { p_profile_id: string }
        Returns: number
      }
    }
    Enums: {
      chat_type: "main" | "event"
      event_kind: "watchmen" | "sponsored"
      event_status: "draft" | "published" | "cancelled" | "completed"
      group_category:
        | "business"
        | "fitness"
        | "faith"
        | "family"
        | "outdoors"
        | "finance"
        | "social"
        | "other"
      group_kind: "group" | "meetup" | "hobby"
      media_type: "none" | "image" | "video"
      meetup_category:
        | "Coffee"
        | "Workout"
        | "Drinks"
        | "Outdoors"
        | "Food"
        | "Other"
      post_kind: "post" | "job" | "need" | "announcement"
      push_platform: "web" | "ios" | "android"
      rsvp_status: "going" | "maybe" | "not_going"
      thread_kind: "dm" | "group" | "event"
      user_role: "super_admin" | "admin" | "member"
      user_status: "pending" | "approved" | "rejected"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      chat_type: ["main", "event"],
      event_kind: ["watchmen", "sponsored"],
      event_status: ["draft", "published", "cancelled", "completed"],
      group_category: [
        "business",
        "fitness",
        "faith",
        "family",
        "outdoors",
        "finance",
        "social",
        "other",
      ],
      group_kind: ["group", "meetup", "hobby"],
      media_type: ["none", "image", "video"],
      meetup_category: [
        "Coffee",
        "Workout",
        "Drinks",
        "Outdoors",
        "Food",
        "Other",
      ],
      post_kind: ["post", "job", "need", "announcement"],
      push_platform: ["web", "ios", "android"],
      rsvp_status: ["going", "maybe", "not_going"],
      thread_kind: ["dm", "group", "event"],
      user_role: ["super_admin", "admin", "member"],
      user_status: ["pending", "approved", "rejected"],
    },
  },
} as const
