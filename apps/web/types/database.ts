export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      area: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          location_id: string | null
          name: string
          order_index: number
          organization_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          location_id?: string | null
          name: string
          order_index?: number
          organization_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          location_id?: string | null
          name?: string
          order_index?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "area_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "area_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      asset: {
        Row: {
          area_id: string | null
          brand: string | null
          category: string | null
          code: string | null
          created_at: string
          deleted_at: string | null
          id: string
          location_id: string
          model: string | null
          name: string
          notes: string | null
          organization_id: string
          purchased_on: string | null
          qr_token: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
          warranty_until: string | null
        }
        Insert: {
          area_id?: string | null
          brand?: string | null
          category?: string | null
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          location_id: string
          model?: string | null
          name: string
          notes?: string | null
          organization_id: string
          purchased_on?: string | null
          qr_token?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          warranty_until?: string | null
        }
        Update: {
          area_id?: string | null
          brand?: string | null
          category?: string | null
          code?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          location_id?: string
          model?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          purchased_on?: string | null
          qr_token?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      attachment: {
        Row: {
          captured_at: string | null
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["linked_entity"]
          expires_on: string | null
          height: number | null
          id: string
          kind: Database["public"]["Enums"]["attachment_kind"]
          location_id: string | null
          mime_type: string
          organization_id: string
          size_bytes: number
          storage_bucket: string
          storage_key: string
          uploaded_by_membership_id: string
          width: number | null
        }
        Insert: {
          captured_at?: string | null
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["linked_entity"]
          expires_on?: string | null
          height?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["attachment_kind"]
          location_id?: string | null
          mime_type: string
          organization_id: string
          size_bytes: number
          storage_bucket?: string
          storage_key: string
          uploaded_by_membership_id: string
          width?: number | null
        }
        Update: {
          captured_at?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["linked_entity"]
          expires_on?: string | null
          height?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["attachment_kind"]
          location_id?: string | null
          mime_type?: string
          organization_id?: string
          size_bytes?: number
          storage_bucket?: string
          storage_key?: string
          uploaded_by_membership_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attachment_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachment_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachment_uploaded_by_membership_id_fkey"
            columns: ["uploaded_by_membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_membership_id: string | null
          actor_type: Database["public"]["Enums"]["actor_type"]
          actor_user_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          ip: unknown
          location_id: string | null
          organization_id: string
          request_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_membership_id?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          ip?: unknown
          location_id?: string | null
          organization_id: string
          request_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_membership_id?: string | null
          actor_type?: Database["public"]["Enums"]["actor_type"]
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          ip?: unknown
          location_id?: string | null
          organization_id?: string
          request_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_membership_id_fkey"
            columns: ["actor_membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_item_template: {
        Row: {
          asset_id: string | null
          checklist_template_id: string
          config: Json
          created_at: string
          criticality: Database["public"]["Enums"]["criticality_level"]
          default_role: Database["public"]["Enums"]["org_role"] | null
          due_offset_min: number | null
          id: string
          instructions: string | null
          label: string
          order_index: number
          organization_id: string
          photo_required: boolean
          reference_image_key: string | null
          required: boolean
          section: string
          temperature_point_id: string | null
          tolerance_min: number
          type: Database["public"]["Enums"]["item_type"]
        }
        Insert: {
          asset_id?: string | null
          checklist_template_id: string
          config?: Json
          created_at?: string
          criticality?: Database["public"]["Enums"]["criticality_level"]
          default_role?: Database["public"]["Enums"]["org_role"] | null
          due_offset_min?: number | null
          id?: string
          instructions?: string | null
          label: string
          order_index?: number
          organization_id: string
          photo_required?: boolean
          reference_image_key?: string | null
          required?: boolean
          section?: string
          temperature_point_id?: string | null
          tolerance_min?: number
          type: Database["public"]["Enums"]["item_type"]
        }
        Update: {
          asset_id?: string | null
          checklist_template_id?: string
          config?: Json
          created_at?: string
          criticality?: Database["public"]["Enums"]["criticality_level"]
          default_role?: Database["public"]["Enums"]["org_role"] | null
          due_offset_min?: number | null
          id?: string
          instructions?: string | null
          label?: string
          order_index?: number
          organization_id?: string
          photo_required?: boolean
          reference_image_key?: string | null
          required?: boolean
          section?: string
          temperature_point_id?: string | null
          tolerance_min?: number
          type?: Database["public"]["Enums"]["item_type"]
        }
        Relationships: [
          {
            foreignKeyName: "checklist_item_template_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_item_template_checklist_template_id_fkey"
            columns: ["checklist_template_id"]
            isOneToOne: false
            referencedRelation: "checklist_template"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_item_template_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_item_template_temperature_point_id_fkey"
            columns: ["temperature_point_id"]
            isOneToOne: false
            referencedRelation: "temperature_point"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_response: {
        Row: {
          answered_at: string
          answered_by_membership_id: string
          captured_accuracy_m: number | null
          captured_lat: number | null
          captured_lng: number | null
          client_uuid: string
          correction_reason: string | null
          created_at: string
          device_id: string | null
          id: string
          item_snapshot: Json
          item_template_id: string
          location_id: string
          note: string | null
          organization_id: string
          presence_verified: boolean
          run_id: string
          status: Database["public"]["Enums"]["response_status"]
          superseded_at: string | null
          supersedes_id: string | null
          value_bool: boolean | null
          value_num: number | null
          value_option: string | null
          value_text: string | null
        }
        Insert: {
          answered_at?: string
          answered_by_membership_id: string
          captured_accuracy_m?: number | null
          captured_lat?: number | null
          captured_lng?: number | null
          client_uuid: string
          correction_reason?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          item_snapshot: Json
          item_template_id: string
          location_id: string
          note?: string | null
          organization_id: string
          presence_verified?: boolean
          run_id: string
          status?: Database["public"]["Enums"]["response_status"]
          superseded_at?: string | null
          supersedes_id?: string | null
          value_bool?: boolean | null
          value_num?: number | null
          value_option?: string | null
          value_text?: string | null
        }
        Update: {
          answered_at?: string
          answered_by_membership_id?: string
          captured_accuracy_m?: number | null
          captured_lat?: number | null
          captured_lng?: number | null
          client_uuid?: string
          correction_reason?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          item_snapshot?: Json
          item_template_id?: string
          location_id?: string
          note?: string | null
          organization_id?: string
          presence_verified?: boolean
          run_id?: string
          status?: Database["public"]["Enums"]["response_status"]
          superseded_at?: string | null
          supersedes_id?: string | null
          value_bool?: boolean | null
          value_num?: number | null
          value_option?: string | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_response_answered_by_membership_id_fkey"
            columns: ["answered_by_membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_response_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "device"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_response_item_template_id_fkey"
            columns: ["item_template_id"]
            isOneToOne: false
            referencedRelation: "checklist_item_template"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_response_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_response_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_response_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "checklist_run"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_response_supersedes_id_fkey"
            columns: ["supersedes_id"]
            isOneToOne: false
            referencedRelation: "checklist_response"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_run: {
        Row: {
          answered_items: number
          assigned_membership_id: string | null
          business_date: string
          checklist_template_id: string
          closed_at: string | null
          completed_by_membership_id: string | null
          completion_pct: number
          created_at: string
          due_at: string
          exception_count: number
          failed_items: number
          id: string
          location_id: string
          na_reason: string | null
          opened_at: string | null
          organization_id: string
          scheduled_for: string
          shift_template_id: string | null
          status: Database["public"]["Enums"]["run_status"]
          template_version: number
          total_items: number
          updated_at: string
        }
        Insert: {
          answered_items?: number
          assigned_membership_id?: string | null
          business_date: string
          checklist_template_id: string
          closed_at?: string | null
          completed_by_membership_id?: string | null
          completion_pct?: number
          created_at?: string
          due_at: string
          exception_count?: number
          failed_items?: number
          id?: string
          location_id: string
          na_reason?: string | null
          opened_at?: string | null
          organization_id: string
          scheduled_for: string
          shift_template_id?: string | null
          status?: Database["public"]["Enums"]["run_status"]
          template_version: number
          total_items?: number
          updated_at?: string
        }
        Update: {
          answered_items?: number
          assigned_membership_id?: string | null
          business_date?: string
          checklist_template_id?: string
          closed_at?: string | null
          completed_by_membership_id?: string | null
          completion_pct?: number
          created_at?: string
          due_at?: string
          exception_count?: number
          failed_items?: number
          id?: string
          location_id?: string
          na_reason?: string | null
          opened_at?: string | null
          organization_id?: string
          scheduled_for?: string
          shift_template_id?: string | null
          status?: Database["public"]["Enums"]["run_status"]
          template_version?: number
          total_items?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_run_assigned_membership_id_fkey"
            columns: ["assigned_membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_run_checklist_template_id_fkey"
            columns: ["checklist_template_id"]
            isOneToOne: false
            referencedRelation: "checklist_template"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_run_completed_by_membership_id_fkey"
            columns: ["completed_by_membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_run_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_run_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_run_shift_template_id_fkey"
            columns: ["shift_template_id"]
            isOneToOne: false
            referencedRelation: "shift_template"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_template: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          estimated_minutes: number | null
          id: string
          kind: Database["public"]["Enums"]["shift_kind"]
          location_id: string | null
          name: string
          organization_id: string
          parent_template_id: string | null
          presence_required: Database["public"]["Enums"]["presence_mode"]
          published_at: string | null
          published_by: string | null
          shift_template_id: string | null
          status: Database["public"]["Enums"]["template_status"]
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["shift_kind"]
          location_id?: string | null
          name: string
          organization_id: string
          parent_template_id?: string | null
          presence_required?: Database["public"]["Enums"]["presence_mode"]
          published_at?: string | null
          published_by?: string | null
          shift_template_id?: string | null
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["shift_kind"]
          location_id?: string | null
          name?: string
          organization_id?: string
          parent_template_id?: string | null
          presence_required?: Database["public"]["Enums"]["presence_mode"]
          published_at?: string | null
          published_by?: string | null
          shift_template_id?: string | null
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "checklist_template_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_template_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_template_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_template_parent_template_id_fkey"
            columns: ["parent_template_id"]
            isOneToOne: false
            referencedRelation: "checklist_template"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_template_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_template_shift_template_id_fkey"
            columns: ["shift_template_id"]
            isOneToOne: false
            referencedRelation: "shift_template"
            referencedColumns: ["id"]
          },
        ]
      }
      comment: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["linked_entity"]
          id: string
          is_internal: boolean
          location_id: string | null
          membership_id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["linked_entity"]
          id?: string
          is_internal?: boolean
          location_id?: string | null
          membership_id: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["linked_entity"]
          id?: string
          is_internal?: boolean
          location_id?: string | null
          membership_id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      corrective_action: {
        Row: {
          created_at: string
          description: string
          exception_id: string
          id: string
          location_id: string
          organization_id: string
          performed_at: string
          performed_by_membership_id: string
          requires_verification: boolean
          verified_at: string | null
          verified_by_membership_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          exception_id: string
          id?: string
          location_id: string
          organization_id: string
          performed_at?: string
          performed_by_membership_id: string
          requires_verification?: boolean
          verified_at?: string | null
          verified_by_membership_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          exception_id?: string
          id?: string
          location_id?: string
          organization_id?: string
          performed_at?: string
          performed_by_membership_id?: string
          requires_verification?: boolean
          verified_at?: string | null
          verified_by_membership_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corrective_action_exception_id_fkey"
            columns: ["exception_id"]
            isOneToOne: false
            referencedRelation: "exception"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_action_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_action_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_action_performed_by_membership_id_fkey"
            columns: ["performed_by_membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_action_verified_by_membership_id_fkey"
            columns: ["verified_by_membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
        ]
      }
      device: {
        Row: {
          created_at: string
          enrolled_by: string | null
          id: string
          last_seen_at: string | null
          location_id: string
          name: string
          organization_id: string
          platform: string | null
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          created_at?: string
          enrolled_by?: string | null
          id?: string
          last_seen_at?: string | null
          location_id: string
          name: string
          organization_id: string
          platform?: string | null
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          created_at?: string
          enrolled_by?: string | null
          id?: string
          last_seen_at?: string | null
          location_id?: string
          name?: string
          organization_id?: string
          platform?: string | null
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      document: {
        Row: {
          alert_offsets_days: number[]
          created_at: string
          expires_on: string | null
          id: string
          issued_on: string | null
          issuer: string | null
          last_alert_offset: number | null
          location_id: string | null
          membership_id: string | null
          organization_id: string
          responsible_membership_id: string | null
          status: Database["public"]["Enums"]["document_status"]
          storage_bucket: string
          storage_key: string | null
          title: string
          type: Database["public"]["Enums"]["document_type"]
          updated_at: string
        }
        Insert: {
          alert_offsets_days?: number[]
          created_at?: string
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          issuer?: string | null
          last_alert_offset?: number | null
          location_id?: string | null
          membership_id?: string | null
          organization_id: string
          responsible_membership_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_bucket?: string
          storage_key?: string | null
          title: string
          type: Database["public"]["Enums"]["document_type"]
          updated_at?: string
        }
        Update: {
          alert_offsets_days?: number[]
          created_at?: string
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          issuer?: string | null
          last_alert_offset?: number | null
          location_id?: string | null
          membership_id?: string | null
          organization_id?: string
          responsible_membership_id?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          storage_bucket?: string
          storage_key?: string | null
          title?: string
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_responsible_membership_id_fkey"
            columns: ["responsible_membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
        ]
      }
      exception: {
        Row: {
          actual: string | null
          asset_id: string | null
          created_at: string
          detail: string | null
          detected_at: string
          detected_by_membership_id: string | null
          dismissed_reason: string | null
          expected: string | null
          id: string
          incident_id: string | null
          item_template_id: string | null
          location_id: string
          organization_id: string
          resolved_at: string | null
          response_id: string | null
          run_id: string | null
          severity: Database["public"]["Enums"]["criticality_level"]
          source_type: Database["public"]["Enums"]["exception_source"]
          status: Database["public"]["Enums"]["exception_status"]
          temperature_point_id: string | null
          temperature_reading_id: string | null
          title: string
          updated_at: string
          verified_at: string | null
          verified_by_membership_id: string | null
        }
        Insert: {
          actual?: string | null
          asset_id?: string | null
          created_at?: string
          detail?: string | null
          detected_at?: string
          detected_by_membership_id?: string | null
          dismissed_reason?: string | null
          expected?: string | null
          id?: string
          incident_id?: string | null
          item_template_id?: string | null
          location_id: string
          organization_id: string
          resolved_at?: string | null
          response_id?: string | null
          run_id?: string | null
          severity?: Database["public"]["Enums"]["criticality_level"]
          source_type: Database["public"]["Enums"]["exception_source"]
          status?: Database["public"]["Enums"]["exception_status"]
          temperature_point_id?: string | null
          temperature_reading_id?: string | null
          title: string
          updated_at?: string
          verified_at?: string | null
          verified_by_membership_id?: string | null
        }
        Update: {
          actual?: string | null
          asset_id?: string | null
          created_at?: string
          detail?: string | null
          detected_at?: string
          detected_by_membership_id?: string | null
          dismissed_reason?: string | null
          expected?: string | null
          id?: string
          incident_id?: string | null
          item_template_id?: string | null
          location_id?: string
          organization_id?: string
          resolved_at?: string | null
          response_id?: string | null
          run_id?: string | null
          severity?: Database["public"]["Enums"]["criticality_level"]
          source_type?: Database["public"]["Enums"]["exception_source"]
          status?: Database["public"]["Enums"]["exception_status"]
          temperature_point_id?: string | null
          temperature_reading_id?: string | null
          title?: string
          updated_at?: string
          verified_at?: string | null
          verified_by_membership_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exception_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exception_detected_by_membership_id_fkey"
            columns: ["detected_by_membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exception_item_template_id_fkey"
            columns: ["item_template_id"]
            isOneToOne: false
            referencedRelation: "checklist_item_template"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exception_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exception_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exception_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "checklist_response"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exception_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "checklist_run"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exception_temperature_point_id_fkey"
            columns: ["temperature_point_id"]
            isOneToOne: false
            referencedRelation: "temperature_point"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exception_verified_by_membership_id_fkey"
            columns: ["verified_by_membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_exception_incident"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_exception_reading"
            columns: ["temperature_reading_id"]
            isOneToOne: false
            referencedRelation: "temperature_reading"
            referencedColumns: ["id"]
          },
        ]
      }
      incident: {
        Row: {
          area_id: string | null
          asset_id: string | null
          assigned_to_membership_id: string | null
          category: Database["public"]["Enums"]["incident_category"]
          closed_at: string | null
          code: string | null
          cost_amount: number | null
          cost_currency: string | null
          created_at: string
          description: string | null
          downtime_minutes: number | null
          due_at: string | null
          first_response_at: string | null
          id: string
          location_id: string
          organization_id: string
          priority: Database["public"]["Enums"]["criticality_level"]
          reported_by_membership_id: string
          resolution_note: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at: string
          vendor_contact: string | null
          vendor_name: string | null
          verified_at: string | null
          verified_by_membership_id: string | null
        }
        Insert: {
          area_id?: string | null
          asset_id?: string | null
          assigned_to_membership_id?: string | null
          category: Database["public"]["Enums"]["incident_category"]
          closed_at?: string | null
          code?: string | null
          cost_amount?: number | null
          cost_currency?: string | null
          created_at?: string
          description?: string | null
          downtime_minutes?: number | null
          due_at?: string | null
          first_response_at?: string | null
          id?: string
          location_id: string
          organization_id: string
          priority?: Database["public"]["Enums"]["criticality_level"]
          reported_by_membership_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at?: string
          vendor_contact?: string | null
          vendor_name?: string | null
          verified_at?: string | null
          verified_by_membership_id?: string | null
        }
        Update: {
          area_id?: string | null
          asset_id?: string | null
          assigned_to_membership_id?: string | null
          category?: Database["public"]["Enums"]["incident_category"]
          closed_at?: string | null
          code?: string | null
          cost_amount?: number | null
          cost_currency?: string | null
          created_at?: string
          description?: string | null
          downtime_minutes?: number | null
          due_at?: string | null
          first_response_at?: string | null
          id?: string
          location_id?: string
          organization_id?: string
          priority?: Database["public"]["Enums"]["criticality_level"]
          reported_by_membership_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["incident_status"]
          title?: string
          updated_at?: string
          vendor_contact?: string | null
          vendor_name?: string | null
          verified_at?: string | null
          verified_by_membership_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_assigned_to_membership_id_fkey"
            columns: ["assigned_to_membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_reported_by_membership_id_fkey"
            columns: ["reported_by_membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_verified_by_membership_id_fkey"
            columns: ["verified_by_membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
        ]
      }
      location: {
        Row: {
          address: string | null
          business_day_start: string
          city: string | null
          created_at: string
          deleted_at: string | null
          geofence_radius_m: number
          id: string
          lat: number | null
          lng: number | null
          name: string
          opened_on: string | null
          organization_id: string
          phone: string | null
          province: string | null
          slug: string
          status: Database["public"]["Enums"]["entity_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_day_start?: string
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          geofence_radius_m?: number
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          opened_on?: string | null
          organization_id: string
          phone?: string | null
          province?: string | null
          slug: string
          status?: Database["public"]["Enums"]["entity_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_day_start?: string
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          geofence_radius_m?: number
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          opened_on?: string | null
          organization_id?: string
          phone?: string | null
          province?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["entity_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      membership: {
        Row: {
          accepted_at: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          employee_code: string | null
          failed_pin_count: number
          id: string
          invited_at: string | null
          job_title: string | null
          locked_until: string | null
          organization_id: string
          pin_hash: string | null
          pin_set_at: string | null
          role: Database["public"]["Enums"]["org_role"]
          status: Database["public"]["Enums"]["entity_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          employee_code?: string | null
          failed_pin_count?: number
          id?: string
          invited_at?: string | null
          job_title?: string | null
          locked_until?: string | null
          organization_id: string
          pin_hash?: string | null
          pin_set_at?: string | null
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          employee_code?: string | null
          failed_pin_count?: number
          id?: string
          invited_at?: string | null
          job_title?: string | null
          locked_until?: string | null
          organization_id?: string
          pin_hash?: string | null
          pin_set_at?: string | null
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["entity_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_location: {
        Row: {
          created_at: string
          is_primary: boolean
          location_id: string
          membership_id: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          is_primary?: boolean
          location_id: string
          membership_id: string
          organization_id: string
        }
        Update: {
          created_at?: string
          is_primary?: boolean
          location_id?: string
          membership_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_location_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_location_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_location_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      notification: {
        Row: {
          attempts: number
          body: string
          channel: Database["public"]["Enums"]["notif_channel"]
          created_at: string
          dedupe_key: string | null
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["linked_entity"] | null
          error: string | null
          id: string
          location_id: string | null
          organization_id: string
          payload: Json
          provider_message_id: string | null
          read_at: string | null
          recipient_membership_id: string
          scheduled_for: string
          sent_at: string | null
          status: Database["public"]["Enums"]["notif_status"]
          title: string
          type: string
        }
        Insert: {
          attempts?: number
          body: string
          channel: Database["public"]["Enums"]["notif_channel"]
          created_at?: string
          dedupe_key?: string | null
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["linked_entity"] | null
          error?: string | null
          id?: string
          location_id?: string | null
          organization_id: string
          payload?: Json
          provider_message_id?: string | null
          read_at?: string | null
          recipient_membership_id: string
          scheduled_for?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notif_status"]
          title: string
          type: string
        }
        Update: {
          attempts?: number
          body?: string
          channel?: Database["public"]["Enums"]["notif_channel"]
          created_at?: string
          dedupe_key?: string | null
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["linked_entity"] | null
          error?: string | null
          id?: string
          location_id?: string | null
          organization_id?: string
          payload?: Json
          provider_message_id?: string | null
          read_at?: string | null
          recipient_membership_id?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notif_status"]
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_recipient_membership_id_fkey"
            columns: ["recipient_membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preference: {
        Row: {
          channels: Database["public"]["Enums"]["notif_channel"][]
          enabled: boolean
          membership_id: string
          quiet_hours: Json
          type: string
        }
        Insert: {
          channels?: Database["public"]["Enums"]["notif_channel"][]
          enabled?: boolean
          membership_id: string
          quiet_hours?: Json
          type: string
        }
        Update: {
          channels?: Database["public"]["Enums"]["notif_channel"][]
          enabled?: boolean
          membership_id?: string
          quiet_hours?: Json
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preference_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
        ]
      }
      organization: {
        Row: {
          country_code: string
          created_at: string
          default_timezone: string
          deleted_at: string | null
          id: string
          locale: string
          name: string
          slug: string
          status: Database["public"]["Enums"]["entity_status"]
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          default_timezone?: string
          deleted_at?: string | null
          id?: string
          locale?: string
          name: string
          slug: string
          status?: Database["public"]["Enums"]["entity_status"]
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          default_timezone?: string
          deleted_at?: string | null
          id?: string
          locale?: string
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["entity_status"]
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      plan_limit: {
        Row: {
          display_name: string
          features: Json
          history_days: number
          max_locations: number | null
          max_templates: number | null
          max_users: number | null
          monthly_photo_quota: number | null
          photo_retention_days: number
          plan: Database["public"]["Enums"]["plan_tier"]
          price_usd_month: number
        }
        Insert: {
          display_name: string
          features?: Json
          history_days: number
          max_locations?: number | null
          max_templates?: number | null
          max_users?: number | null
          monthly_photo_quota?: number | null
          photo_retention_days: number
          plan: Database["public"]["Enums"]["plan_tier"]
          price_usd_month: number
        }
        Update: {
          display_name?: string
          features?: Json
          history_days?: number
          max_locations?: number | null
          max_templates?: number | null
          max_users?: number | null
          monthly_photo_quota?: number | null
          photo_retention_days?: number
          plan?: Database["public"]["Enums"]["plan_tier"]
          price_usd_month?: number
        }
        Relationships: []
      }
      push_subscription: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          membership_id: string
          p256dh: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          membership_id: string
          p256dh: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          membership_id?: string
          p256dh?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscription_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
        ]
      }
      recurrence_rule: {
        Row: {
          active: boolean
          at_times: string[]
          by_monthday: number[] | null
          by_weekday: number[] | null
          checklist_template_id: string
          created_at: string
          ends_on: string | null
          freq: Database["public"]["Enums"]["recurrence_freq"]
          id: string
          location_id: string | null
          organization_id: string
          starts_on: string
          tolerance_min: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          at_times?: string[]
          by_monthday?: number[] | null
          by_weekday?: number[] | null
          checklist_template_id: string
          created_at?: string
          ends_on?: string | null
          freq: Database["public"]["Enums"]["recurrence_freq"]
          id?: string
          location_id?: string | null
          organization_id: string
          starts_on?: string
          tolerance_min?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          at_times?: string[]
          by_monthday?: number[] | null
          by_weekday?: number[] | null
          checklist_template_id?: string
          created_at?: string
          ends_on?: string | null
          freq?: Database["public"]["Enums"]["recurrence_freq"]
          id?: string
          location_id?: string | null
          organization_id?: string
          starts_on?: string
          tolerance_min?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurrence_rule_checklist_template_id_fkey"
            columns: ["checklist_template_id"]
            isOneToOne: false
            referencedRelation: "checklist_template"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrence_rule_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrence_rule_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_handoff: {
        Row: {
          absent_staff: string | null
          ack_at: string | null
          ack_by_membership_id: string | null
          business_date: string
          created_at: string
          critical_stock: string | null
          events_note: string | null
          from_membership_id: string
          id: string
          issues: string | null
          location_id: string
          open_incident_ids: string[]
          organization_id: string
          pending_tasks: string | null
          shift_template_id: string | null
          shortages: string | null
          submitted_at: string
          to_membership_id: string | null
        }
        Insert: {
          absent_staff?: string | null
          ack_at?: string | null
          ack_by_membership_id?: string | null
          business_date: string
          created_at?: string
          critical_stock?: string | null
          events_note?: string | null
          from_membership_id: string
          id?: string
          issues?: string | null
          location_id: string
          open_incident_ids?: string[]
          organization_id: string
          pending_tasks?: string | null
          shift_template_id?: string | null
          shortages?: string | null
          submitted_at?: string
          to_membership_id?: string | null
        }
        Update: {
          absent_staff?: string | null
          ack_at?: string | null
          ack_by_membership_id?: string | null
          business_date?: string
          created_at?: string
          critical_stock?: string | null
          events_note?: string | null
          from_membership_id?: string
          id?: string
          issues?: string | null
          location_id?: string
          open_incident_ids?: string[]
          organization_id?: string
          pending_tasks?: string | null
          shift_template_id?: string | null
          shortages?: string | null
          submitted_at?: string
          to_membership_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_handoff_ack_by_membership_id_fkey"
            columns: ["ack_by_membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_handoff_from_membership_id_fkey"
            columns: ["from_membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_handoff_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_handoff_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_handoff_shift_template_id_fkey"
            columns: ["shift_template_id"]
            isOneToOne: false
            referencedRelation: "shift_template"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_handoff_to_membership_id_fkey"
            columns: ["to_membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_template: {
        Row: {
          active: boolean
          created_at: string
          days_of_week: number[]
          deleted_at: string | null
          end_time: string
          id: string
          kind: Database["public"]["Enums"]["shift_kind"]
          location_id: string | null
          name: string
          organization_id: string
          start_time: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          days_of_week?: number[]
          deleted_at?: string | null
          end_time: string
          id?: string
          kind: Database["public"]["Enums"]["shift_kind"]
          location_id?: string | null
          name: string
          organization_id: string
          start_time: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          days_of_week?: number[]
          deleted_at?: string | null
          end_time?: string
          id?: string
          kind?: Database["public"]["Enums"]["shift_kind"]
          location_id?: string | null
          name?: string
          organization_id?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_template_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_template_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription: {
        Row: {
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          locations_included: number
          organization_id: string
          plan: Database["public"]["Enums"]["plan_tier"]
          provider: string | null
          provider_ref: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          unit_price_usd: number
          updated_at: string
        }
        Insert: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          locations_included?: number
          organization_id: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          provider?: string | null
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          unit_price_usd?: number
          updated_at?: string
        }
        Update: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          locations_included?: number
          organization_id?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          provider?: string | null
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          unit_price_usd?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_plan_fkey"
            columns: ["plan"]
            isOneToOne: false
            referencedRelation: "plan_limit"
            referencedColumns: ["plan"]
          },
        ]
      }
      temperature_point: {
        Row: {
          active: boolean
          area_id: string | null
          asset_id: string | null
          created_at: string
          criticality: Database["public"]["Enums"]["criticality_level"]
          deleted_at: string | null
          frequency_config: Json
          id: string
          kind: Database["public"]["Enums"]["temp_point_kind"]
          location_id: string
          max_c: number
          min_c: number
          name: string
          order_index: number
          organization_id: string
          responsible_role: Database["public"]["Enums"]["org_role"] | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          area_id?: string | null
          asset_id?: string | null
          created_at?: string
          criticality?: Database["public"]["Enums"]["criticality_level"]
          deleted_at?: string | null
          frequency_config?: Json
          id?: string
          kind: Database["public"]["Enums"]["temp_point_kind"]
          location_id: string
          max_c: number
          min_c: number
          name: string
          order_index?: number
          organization_id: string
          responsible_role?: Database["public"]["Enums"]["org_role"] | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          area_id?: string | null
          asset_id?: string | null
          created_at?: string
          criticality?: Database["public"]["Enums"]["criticality_level"]
          deleted_at?: string | null
          frequency_config?: Json
          id?: string
          kind?: Database["public"]["Enums"]["temp_point_kind"]
          location_id?: string
          max_c?: number
          min_c?: number
          name?: string
          order_index?: number
          organization_id?: string
          responsible_role?: Database["public"]["Enums"]["org_role"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "temperature_point_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_point_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_point_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_point_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      temperature_reading: {
        Row: {
          checklist_response_id: string | null
          client_uuid: string
          created_at: string
          device_id: string | null
          exception_id: string | null
          id: string
          in_range: boolean
          location_id: string
          max_c_snapshot: number
          min_c_snapshot: number
          note: string | null
          organization_id: string
          recorded_by_membership_id: string
          source: Database["public"]["Enums"]["reading_source"]
          taken_at: string
          temperature_point_id: string
          value_c: number
        }
        Insert: {
          checklist_response_id?: string | null
          client_uuid?: string
          created_at?: string
          device_id?: string | null
          exception_id?: string | null
          id?: string
          in_range: boolean
          location_id: string
          max_c_snapshot: number
          min_c_snapshot: number
          note?: string | null
          organization_id: string
          recorded_by_membership_id: string
          source?: Database["public"]["Enums"]["reading_source"]
          taken_at?: string
          temperature_point_id: string
          value_c: number
        }
        Update: {
          checklist_response_id?: string | null
          client_uuid?: string
          created_at?: string
          device_id?: string | null
          exception_id?: string | null
          id?: string
          in_range?: boolean
          location_id?: string
          max_c_snapshot?: number
          min_c_snapshot?: number
          note?: string | null
          organization_id?: string
          recorded_by_membership_id?: string
          source?: Database["public"]["Enums"]["reading_source"]
          taken_at?: string
          temperature_point_id?: string
          value_c?: number
        }
        Relationships: [
          {
            foreignKeyName: "temperature_reading_checklist_response_id_fkey"
            columns: ["checklist_response_id"]
            isOneToOne: false
            referencedRelation: "checklist_response"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_reading_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "device"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_reading_exception_id_fkey"
            columns: ["exception_id"]
            isOneToOne: false
            referencedRelation: "exception"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_reading_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_reading_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_reading_recorded_by_membership_id_fkey"
            columns: ["recorded_by_membership_id"]
            isOneToOne: false
            referencedRelation: "membership"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temperature_reading_temperature_point_id_fkey"
            columns: ["temperature_point_id"]
            isOneToOne: false
            referencedRelation: "temperature_point"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_counter: {
        Row: {
          active_locations: number
          active_users: number
          organization_id: string
          period: string
          photos_uploaded: number
          storage_bytes: number
          updated_at: string
        }
        Insert: {
          active_locations?: number
          active_users?: number
          organization_id: string
          period: string
          photos_uploaded?: number
          storage_bytes?: number
          updated_at?: string
        }
        Update: {
          active_locations?: number
          active_users?: number
          organization_id?: string
          period?: string
          photos_uploaded?: number
          storage_bytes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_counter_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profile: {
        Row: {
          active_organization_id: string | null
          avatar_key: string | null
          created_at: string
          full_name: string
          id: string
          last_login_at: string | null
          locale: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active_organization_id?: string | null
          avatar_key?: string | null
          created_at?: string
          full_name?: string
          id: string
          last_login_at?: string | null
          locale?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active_organization_id?: string | null
          avatar_key?: string | null
          created_at?: string
          full_name?: string
          id?: string
          last_login_at?: string | null
          locale?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profile_active_organization_id_fkey"
            columns: ["active_organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_attention_today: {
        Row: {
          detalle: string | null
          entity_id: string | null
          entity_type: string | null
          location_id: string | null
          location_name: string | null
          motivo: string | null
          organization_id: string | null
          prioridad: number | null
          referencia_at: string | null
          titulo: string | null
        }
        Relationships: []
      }
      v_incident_metrics: {
        Row: {
          abiertas: number | null
          criticas: number | null
          horas_promedio_resolucion: number | null
          location_id: string | null
          location_name: string | null
          minutos_primera_respuesta: number | null
          organization_id: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      v_location_compliance: {
        Row: {
          business_date: string | null
          excepciones: number | null
          items_fallados: number | null
          location_id: string | null
          location_name: string | null
          organization_id: string | null
          pct_cumplimiento: number | null
          pct_items: number | null
          runs_abiertos: number | null
          runs_completados: number | null
          runs_totales: number | null
          runs_vencidos: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_run_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_run_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
      v_recurring_problems: {
        Row: {
          fallas_30d: number | null
          fallas_turno_noche: number | null
          location_id: string | null
          location_name: string | null
          organization_id: string | null
          primera: string | null
          punto: string | null
          ultima: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exception_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exception_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_organization_with_owner: {
        Args: { p_org_name: string; p_full_name?: string | null }
        Returns: string
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      set_membership_pin: {
        Args: { p_membership_id: string; p_pin: string }
        Returns: undefined
      }
      switch_organization: {
        Args: { p_organization_id: string }
        Returns: string
      }
    }
    Enums: {
      actor_type: "user" | "system" | "ai"
      attachment_kind:
        | "evidence"
        | "before"
        | "after"
        | "reference"
        | "signature"
      billing_cycle: "monthly" | "annual"
      criticality_level: "low" | "medium" | "high" | "critical"
      document_status: "active" | "expired" | "archived"
      document_type:
        | "manipulador"
        | "mantenimiento"
        | "fumigacion"
        | "certificado"
        | "interno"
        | "otro"
      entity_status: "active" | "inactive" | "suspended"
      exception_source:
        | "temperature"
        | "checklist_item"
        | "overdue_run"
        | "manual"
      exception_status:
        | "open"
        | "action_pending"
        | "resolved"
        | "verified"
        | "dismissed"
      incident_category:
        | "equipo"
        | "edilicio"
        | "faltante"
        | "limpieza"
        | "seguridad"
        | "plaga"
        | "frio"
        | "electricidad"
        | "agua"
        | "personal"
        | "otro"
      incident_status:
        | "new"
        | "assigned"
        | "in_progress"
        | "waiting_third_party"
        | "resolved"
        | "verified"
        | "closed"
      item_type:
        | "checkbox"
        | "text"
        | "number"
        | "temperature"
        | "select"
        | "photo"
        | "comment"
        | "signature"
      linked_entity:
        | "incident"
        | "exception"
        | "corrective_action"
        | "checklist_response"
        | "checklist_run"
        | "shift_handoff"
        | "document"
        | "asset"
        | "location"
      notif_channel: "push" | "email" | "whatsapp" | "inapp"
      notif_status: "pending" | "sent" | "failed" | "read" | "canceled"
      org_role:
        | "owner"
        | "gm"
        | "manager"
        | "employee"
        | "maintenance"
        | "auditor"
      plan_tier: "free" | "local" | "chain" | "enterprise"
      presence_mode: "none" | "gps" | "device"
      reading_source: "checklist" | "adhoc" | "sensor"
      recurrence_freq: "daily" | "weekly" | "monthly" | "custom"
      response_status: "ok" | "fail" | "na" | "skipped"
      run_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "overdue"
        | "failed"
        | "na"
      shift_kind: "apertura" | "cambio" | "cierre" | "control"
      subscription_status: "trialing" | "active" | "past_due" | "canceled"
      temp_point_kind:
        | "fridge"
        | "freezer"
        | "chamber"
        | "hot_holding"
        | "food"
        | "receiving"
      template_status: "draft" | "published" | "archived"
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
    Enums: {
      actor_type: ["user", "system", "ai"],
      attachment_kind: ["evidence", "before", "after", "reference", "signature"],
      billing_cycle: ["monthly", "annual"],
      criticality_level: ["low", "medium", "high", "critical"],
      document_status: ["active", "expired", "archived"],
      document_type: ["manipulador", "mantenimiento", "fumigacion", "certificado", "interno", "otro"],
      entity_status: ["active", "inactive", "suspended"],
      exception_source: ["temperature", "checklist_item", "overdue_run", "manual"],
      exception_status: ["open", "action_pending", "resolved", "verified", "dismissed"],
      incident_category: ["equipo", "edilicio", "faltante", "limpieza", "seguridad", "plaga", "frio", "electricidad", "agua", "personal", "otro"],
      incident_status: ["new", "assigned", "in_progress", "waiting_third_party", "resolved", "verified", "closed"],
      item_type: ["checkbox", "text", "number", "temperature", "select", "photo", "comment", "signature"],
      linked_entity: ["incident", "exception", "corrective_action", "checklist_response", "checklist_run", "shift_handoff", "document", "asset", "location"],
      notif_channel: ["push", "email", "whatsapp", "inapp"],
      notif_status: ["pending", "sent", "failed", "read", "canceled"],
      org_role: ["owner", "gm", "manager", "employee", "maintenance", "auditor"],
      plan_tier: ["free", "local", "chain", "enterprise"],
      presence_mode: ["none", "gps", "device"],
      reading_source: ["checklist", "adhoc", "sensor"],
      recurrence_freq: ["daily", "weekly", "monthly", "custom"],
      response_status: ["ok", "fail", "na", "skipped"],
      run_status: ["pending", "in_progress", "completed", "overdue", "failed", "na"],
      shift_kind: ["apertura", "cambio", "cierre", "control"],
      subscription_status: ["trialing", "active", "past_due", "canceled"],
      temp_point_kind: ["fridge", "freezer", "chamber", "hot_holding", "food", "receiving"],
      template_status: ["draft", "published", "archived"],
    },
  },
} as const
