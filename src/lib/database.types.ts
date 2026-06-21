// 📁 src/lib/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string | null;
          role: 'family' | 'aidant' | 'coordinator' | 'admin';
          avatar_url: string | null;
          patient_category: 'senior' | 'maman_bebe' | null;
          is_active: boolean;
          email_verified: boolean;
          phone_verified: boolean;
          last_latitude: number | null;
          last_longitude: number | null;
          last_location_update: string | null;
          preferences: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          phone?: string | null;
          role?: 'family' | 'aidant' | 'coordinator' | 'admin';
          avatar_url?: string | null;
          patient_category?: 'senior' | 'maman_bebe' | null;
          is_active?: boolean;
          email_verified?: boolean;
          phone_verified?: boolean;
          last_latitude?: number | null;
          last_longitude?: number | null;
          last_location_update?: string | null;
          preferences?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          phone?: string | null;
          role?: 'family' | 'aidant' | 'coordinator' | 'admin';
          avatar_url?: string | null;
          patient_category?: 'senior' | 'maman_bebe' | null;
          is_active?: boolean;
          email_verified?: boolean;
          phone_verified?: boolean;
          last_latitude?: number | null;
          last_longitude?: number | null;
          last_location_update?: string | null;
          preferences?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      
      patients: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          age: number | null;
          gender: 'male' | 'female' | 'other' | null;
          address: string;
          latitude: number | null;
          longitude: number | null;
          phone: string | null;
          emergency_contact: string | null;
          emergency_contact_name: string | null;
          category: 'senior' | 'maman_bebe';
          status: 'active' | 'inactive' | 'archived';
          notes: string | null;
          allergies: string | null;
          treatments: string | null;
          conditions: string | null;
          medical_history: string | null;
          preferred_language: string;
          special_requirements: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          age?: number | null;
          gender?: 'male' | 'female' | 'other' | null;
          address: string;
          latitude?: number | null;
          longitude?: number | null;
          phone?: string | null;
          emergency_contact?: string | null;
          emergency_contact_name?: string | null;
          category: 'senior' | 'maman_bebe';
          status?: 'active' | 'inactive' | 'archived';
          notes?: string | null;
          allergies?: string | null;
          treatments?: string | null;
          conditions?: string | null;
          medical_history?: string | null;
          preferred_language?: string;
          special_requirements?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          age?: number | null;
          gender?: 'male' | 'female' | 'other' | null;
          address?: string;
          latitude?: number | null;
          longitude?: number | null;
          phone?: string | null;
          emergency_contact?: string | null;
          emergency_contact_name?: string | null;
          category?: 'senior' | 'maman_bebe';
          status?: 'active' | 'inactive' | 'archived';
          notes?: string | null;
          allergies?: string | null;
          treatments?: string | null;
          conditions?: string | null;
          medical_history?: string | null;
          preferred_language?: string;
          special_requirements?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      
      patient_family_links: {
        Row: {
          id: string;
          patient_id: string;
          family_id: string;
          relationship: string | null;
          is_primary: boolean;
          can_manage_visits: boolean;
          can_manage_orders: boolean;
          can_receive_notifications: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          family_id: string;
          relationship?: string | null;
          is_primary?: boolean;
          can_manage_visits?: boolean;
          can_manage_orders?: boolean;
          can_receive_notifications?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          family_id?: string;
          relationship?: string | null;
          is_primary?: boolean;
          can_manage_visits?: boolean;
          can_manage_orders?: boolean;
          can_receive_notifications?: boolean;
          created_at?: string;
        };
      };
      
      aidants: {
        Row: {
          id: string;
          user_id: string;
          specialties: string[];
          available: boolean;
          rating: number;
          total_missions: number;
          completed_missions: number;
          cancelled_missions: number;
          average_response_time: number | null;
          bio: string | null;
          hourly_rate: number | null;
          is_verified: boolean;
          background_check_date: string | null;
          languages: string[];
          availability_hours: Json | null;
          birth_date: string | null;
          address: string | null;
          experience_years: number | null;
          zones: string[];
          status: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          specialties?: string[];
          available?: boolean;
          rating?: number;
          total_missions?: number;
          completed_missions?: number;
          cancelled_missions?: number;
          average_response_time?: number | null;
          bio?: string | null;
          hourly_rate?: number | null;
          is_verified?: boolean;
          background_check_date?: string | null;
          languages?: string[];
          availability_hours?: Json | null;
          birth_date?: string | null;
          address?: string | null;
          experience_years?: number | null;
          zones?: string[];
          status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          specialties?: string[];
          available?: boolean;
          rating?: number;
          total_missions?: number;
          completed_missions?: number;
          cancelled_missions?: number;
          average_response_time?: number | null;
          bio?: string | null;
          hourly_rate?: number | null;
          is_verified?: boolean;
          background_check_date?: string | null;
          languages?: string[];
          availability_hours?: Json | null;
          birth_date?: string | null;
          address?: string | null;
          experience_years?: number | null;
          zones?: string[];
          status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      
      visites: {
        Row: {
          id: string;
          reference: string;
          patient_id: string;
          aidant_id: string | null;
          coordinator_id: string | null;
          scheduled_date: string;
          scheduled_time: string;
          duration_minutes: number;
          status: 'planifiee' | 'en_attente' | 'en_cours' | 'terminee' | 'validee' | 'annulee' | 'replanifiee' | 'no_show';
          start_time: string | null;
          end_time: string | null;
          actual_duration_minutes: number | null;
          actions: string[];
          notes: string | null;
          report: string | null;
          location_start: Json | null;
          location_end: Json | null;
          location_track: Json | null;
          check_in_time: string | null;
          check_out_time: string | null;
          family_feedback: string | null;
          family_rating: number | null;
          family_rated_at: string | null;
          coordinator_notes: string | null;
          is_urgent: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reference?: string;
          patient_id: string;
          aidant_id?: string | null;
          coordinator_id?: string | null;
          scheduled_date: string;
          scheduled_time: string;
          duration_minutes?: number;
          status?: 'planifiee' | 'en_attente' | 'en_cours' | 'terminee' | 'validee' | 'annulee' | 'replanifiee' | 'no_show';
          start_time?: string | null;
          end_time?: string | null;
          actual_duration_minutes?: number | null;
          actions?: string[];
          notes?: string | null;
          report?: string | null;
          location_start?: Json | null;
          location_end?: Json | null;
          location_track?: Json | null;
          check_in_time?: string | null;
          check_out_time?: string | null;
          family_feedback?: string | null;
          family_rating?: number | null;
          family_rated_at?: string | null;
          coordinator_notes?: string | null;
          is_urgent?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reference?: string;
          patient_id?: string;
          aidant_id?: string | null;
          coordinator_id?: string | null;
          scheduled_date?: string;
          scheduled_time?: string;
          duration_minutes?: number;
          status?: 'planifiee' | 'en_attente' | 'en_cours' | 'terminee' | 'validee' | 'annulee' | 'replanifiee' | 'no_show';
          start_time?: string | null;
          end_time?: string | null;
          actual_duration_minutes?: number | null;
          actions?: string[];
          notes?: string | null;
          report?: string | null;
          location_start?: Json | null;
          location_end?: Json | null;
          location_track?: Json | null;
          check_in_time?: string | null;
          check_out_time?: string | null;
          family_feedback?: string | null;
          family_rating?: number | null;
          family_rated_at?: string | null;
          coordinator_notes?: string | null;
          is_urgent?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      
      visite_photos: {
        Row: {
          id: string;
          visite_id: string;
          photo_url: string;
          caption: string | null;
          photo_type: 'before' | 'during' | 'after' | 'proof' | 'other' | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          visite_id: string;
          photo_url: string;
          caption?: string | null;
          photo_type?: 'before' | 'during' | 'after' | 'proof' | 'other' | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          visite_id?: string;
          photo_url?: string;
          caption?: string | null;
          photo_type?: 'before' | 'during' | 'after' | 'proof' | 'other' | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
      };
      
      visite_audios: {
        Row: {
          id: string;
          visite_id: string;
          audio_url: string;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          visite_id: string;
          audio_url: string;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          visite_id?: string;
          audio_url?: string;
          uploaded_by?: string | null;
          created_at?: string;
        };
      };
      
      commandes: {
        Row: {
          id: string;
          patient_id: string | null;
          family_id: string;
          aidant_id: string | null;
          type: 'medicaments' | 'produits_bebe' | 'produits_hygiene' | 'courses' | 'repas' | 'autre';
          description: string;
          prescription_url: string | null;
          address: string;
          latitude: number | null;
          longitude: number | null;
          status: 'creee' | 'en_attente' | 'acceptee' | 'en_preparation' | 'en_livraison' | 'prete' | 'livree' | 'annulee' | 'refusee';
          estimated_amount: number | null;
          final_amount: number | null;
          delivery_fee: number | null;
          tip_amount: number | null;
          proof_url: string | null;
          delivery_notes: string | null;
          delivery_time: string | null;
          items: Json | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id?: string | null;
          family_id: string;
          aidant_id?: string | null;
          type: 'medicaments' | 'produits_bebe' | 'produits_hygiene' | 'courses' | 'repas' | 'autre';
          description: string;
          prescription_url?: string | null;
          address: string;
          latitude?: number | null;
          longitude?: number | null;
          status?: 'creee' | 'en_attente' | 'acceptee' | 'en_preparation' | 'en_livraison' | 'prete' | 'livree' | 'annulee' | 'refusee';
          estimated_amount?: number | null;
          final_amount?: number | null;
          delivery_fee?: number | null;
          tip_amount?: number | null;
          proof_url?: string | null;
          delivery_notes?: string | null;
          delivery_time?: string | null;
          items?: Json | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string | null;
          family_id?: string;
          aidant_id?: string | null;
          type?: 'medicaments' | 'produits_bebe' | 'produits_hygiene' | 'courses' | 'repas' | 'autre';
          description?: string;
          prescription_url?: string | null;
          address?: string;
          latitude?: number | null;
          longitude?: number | null;
          status?: 'creee' | 'en_attente' | 'acceptee' | 'en_preparation' | 'en_livraison' | 'prete' | 'livree' | 'annulee' | 'refusee';
          estimated_amount?: number | null;
          final_amount?: number | null;
          delivery_fee?: number | null;
          tip_amount?: number | null;
          proof_url?: string | null;
          delivery_notes?: string | null;
          delivery_time?: string | null;
          items?: Json | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string | null;
          attachment_url: string | null;
          attachment_type: 'image' | 'document' | 'voice' | 'video' | null;
          is_read: boolean;
          read_at: string | null;
          is_edited: boolean;
          edited_at: string | null;
          is_deleted: boolean;
          deleted_at: string | null;
          reply_to_message_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content?: string | null;
          attachment_url?: string | null;
          attachment_type?: 'image' | 'document' | 'voice' | 'video' | null;
          is_read?: boolean;
          read_at?: string | null;
          is_edited?: boolean;
          edited_at?: string | null;
          is_deleted?: boolean;
          deleted_at?: string | null;
          reply_to_message_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string | null;
          attachment_url?: string | null;
          attachment_type?: 'image' | 'document' | 'voice' | 'video' | null;
          is_read?: boolean;
          read_at?: string | null;
          is_edited?: boolean;
          edited_at?: string | null;
          is_deleted?: boolean;
          deleted_at?: string | null;
          reply_to_message_id?: string | null;
          created_at?: string;
        };
      };
      
      conversations: {
        Row: {
          id: string;
          participant_ids: string[];
          type: 'direct' | 'group';
          name: string | null;
          avatar_url: string | null;
          last_message_at: string;
          is_active: boolean;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          participant_ids: string[];
          type?: 'direct' | 'group';
          name?: string | null;
          avatar_url?: string | null;
          last_message_at?: string;
          is_active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          participant_ids?: string[];
          type?: 'direct' | 'group';
          name?: string | null;
          avatar_url?: string | null;
          last_message_at?: string;
          is_active?: boolean;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      
      conversation_participants: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          last_read_at: string | null;
          joined_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          last_read_at?: string | null;
          joined_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          last_read_at?: string | null;
          joined_at?: string;
        };
      };
      
      offres: {
        Row: {
          id: string;
          name: string;
          category: 'senior' | 'maman_bebe' | 'pack_confort';
          type: 'ponctuelle' | 'mensuelle' | 'trimestrielle' | 'semestrielle' | 'annuelle' | 'sur_devis';
          description: string | null;
          price: number | null;
          features: string[];
          visits_per_week: number | null;
          duration_days: number | null;
          is_active: boolean;
          is_public: boolean;
          display_order: number;
          badge: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: 'senior' | 'maman_bebe' | 'pack_confort';
          type: 'ponctuelle' | 'mensuelle' | 'trimestrielle' | 'semestrielle' | 'annuelle' | 'sur_devis';
          description?: string | null;
          price?: number | null;
          features?: string[];
          visits_per_week?: number | null;
          duration_days?: number | null;
          is_active?: boolean;
          is_public?: boolean;
          display_order?: number;
          badge?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: 'senior' | 'maman_bebe' | 'pack_confort';
          type?: 'ponctuelle' | 'mensuelle' | 'trimestrielle' | 'semestrielle' | 'annuelle' | 'sur_devis';
          description?: string | null;
          price?: number | null;
          features?: string[];
          visits_per_week?: number | null;
          duration_days?: number | null;
          is_active?: boolean;
          is_public?: boolean;
          display_order?: number;
          badge?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      
      abonnements: {
        Row: {
          id: string;
          user_id: string;
          patient_id: string | null;
          offre_id: string | null;
          status: 'en_attente' | 'actif' | 'expire' | 'annule' | 'suspendu' | 'en_cours_de_renouvellement';
          start_date: string;
          end_date: string;
          auto_renew: boolean;
          renewal_count: number;
          last_renewal_date: string | null;
          cancellation_reason: string | null;
          cancellation_date: string | null;
          payment_method: string | null;
          total_visits: number;
          used_visits: number;
          remaining_visits: number;
          total_orders: number;
          used_orders: number;
          remaining_orders: number;
          preferred_days: string[];
          auto_schedule: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          patient_id?: string | null;
          offre_id?: string | null;
          status?: 'en_attente' | 'actif' | 'expire' | 'annule' | 'suspendu' | 'en_cours_de_renouvellement';
          start_date: string;
          end_date: string;
          auto_renew?: boolean;
          renewal_count?: number;
          last_renewal_date?: string | null;
          cancellation_reason?: string | null;
          cancellation_date?: string | null;
          payment_method?: string | null;
          total_visits?: number;
          used_visits?: number;
          remaining_visits?: number;
          total_orders?: number;
          used_orders?: number;
          remaining_orders?: number;
          preferred_days?: string[];
          auto_schedule?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          patient_id?: string | null;
          offre_id?: string | null;
          status?: 'en_attente' | 'actif' | 'expire' | 'annule' | 'suspendu' | 'en_cours_de_renouvellement';
          start_date?: string;
          end_date?: string;
          auto_renew?: boolean;
          renewal_count?: number;
          last_renewal_date?: string | null;
          cancellation_reason?: string | null;
          cancellation_date?: string | null;
          payment_method?: string | null;
          total_visits?: number;
          used_visits?: number;
          remaining_visits?: number;
          total_orders?: number;
          used_orders?: number;
          remaining_orders?: number;
          preferred_days?: string[];
          auto_schedule?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      
      paiements: {
        Row: {
          id: string;
          abonnement_id: string | null;
          commande_id: string | null;
          user_id: string;
          amount: number;
          currency: string;
          method: 'mobile_money' | 'card' | 'bank_transfer' | 'cash' | 'wallet' | null;
          reference: string | null;
          provider_reference: string | null;
          status: 'en_attente' | 'valide' | 'echoue' | 'rembourse' | 'annule' | 'en_attente_de_confirmation';
          metadata: Json | null;
          paid_at: string | null;
          refunded_at: string | null;
          refund_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          abonnement_id?: string | null;
          commande_id?: string | null;
          user_id: string;
          amount: number;
          currency?: string;
          method?: 'mobile_money' | 'card' | 'bank_transfer' | 'cash' | 'wallet' | null;
          reference?: string | null;
          provider_reference?: string | null;
          status?: 'en_attente' | 'valide' | 'echoue' | 'rembourse' | 'annule' | 'en_attente_de_confirmation';
          metadata?: Json | null;
          paid_at?: string | null;
          refunded_at?: string | null;
          refund_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          abonnement_id?: string | null;
          commande_id?: string | null;
          user_id?: string;
          amount?: number;
          currency?: string;
          method?: 'mobile_money' | 'card' | 'bank_transfer' | 'cash' | 'wallet' | null;
          reference?: string | null;
          provider_reference?: string | null;
          status?: 'en_attente' | 'valide' | 'echoue' | 'rembourse' | 'annule' | 'en_attente_de_confirmation';
          metadata?: Json | null;
          paid_at?: string | null;
          refunded_at?: string | null;
          refund_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          type: 'visite' | 'message' | 'commande' | 'paiement' | 'system' | 'alert' | 'reminder' | 'promotion';
          data: Json | null;
          image_url: string | null;
          is_read: boolean;
          read_at: string | null;
          is_sent: boolean;
          sent_at: string | null;
          is_delivered: boolean;
          delivered_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body: string;
          type: 'visite' | 'message' | 'commande' | 'paiement' | 'system' | 'alert' | 'reminder' | 'promotion';
          data?: Json | null;
          image_url?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          is_sent?: boolean;
          sent_at?: string | null;
          is_delivered?: boolean;
          delivered_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          body?: string;
          type?: 'visite' | 'message' | 'commande' | 'paiement' | 'system' | 'alert' | 'reminder' | 'promotion';
          data?: Json | null;
          image_url?: string | null;
          is_read?: boolean;
          read_at?: string | null;
          is_sent?: boolean;
          sent_at?: string | null;
          is_delivered?: boolean;
          delivered_at?: string | null;
          created_at?: string;
        };
      };
      
      push_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          device_info: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          device_info?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          device_info?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      
      inscriptions: {
        Row: {
          id: string;
          user_id: string | null;
          patient_data: Json | null;
          offre_id: string | null;
          status: 'en_attente' | 'validee' | 'refusee' | 'info_requise' | 'en_cours_de_traitement';
          comments: string | null;
          processed_by: string | null;
          processed_at: string | null;
          source: string;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          patient_data?: Json | null;
          offre_id?: string | null;
          status?: 'en_attente' | 'validee' | 'refusee' | 'info_requise' | 'en_cours_de_traitement';
          comments?: string | null;
          processed_by?: string | null;
          processed_at?: string | null;
          source?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          patient_data?: Json | null;
          offre_id?: string | null;
          status?: 'en_attente' | 'validee' | 'refusee' | 'info_requise' | 'en_cours_de_traitement';
          comments?: string | null;
          processed_by?: string | null;
          processed_at?: string | null;
          source?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      
      ratings: {
        Row: {
          id: string;
          visite_id: string;
          rated_by: string;
          rated_user_id: string;
          rating: number;
          comment: string | null;
          categories: Json | null;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          visite_id: string;
          rated_by: string;
          rated_user_id: string;
          rating: number;
          comment?: string | null;
          categories?: Json | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          visite_id?: string;
          rated_by?: string;
          rated_user_id?: string;
          rating?: number;
          comment?: string | null;
          categories?: Json | null;
          is_public?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      
      subscription_preferences: {
        Row: {
          id: string;
          subscription_id: string;
          preferred_days: string[];
          preferred_time: string;
          is_auto_generated: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subscription_id: string;
          preferred_days?: string[];
          preferred_time?: string;
          is_auto_generated?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subscription_id?: string;
          preferred_days?: string[];
          preferred_time?: string;
          is_auto_generated?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      
      visite_planning: {
        Row: {
          id: string;
          subscription_id: string;
          scheduled_date: string;
          scheduled_time: string;
          duration_minutes: number;
          status: 'planifiee' | 'terminee' | 'annulee';
          visit_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subscription_id: string;
          scheduled_date: string;
          scheduled_time: string;
          duration_minutes?: number;
          status?: 'planifiee' | 'terminee' | 'annulee';
          visit_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          subscription_id?: string;
          scheduled_date?: string;
          scheduled_time?: string;
          duration_minutes?: number;
          status?: 'planifiee' | 'terminee' | 'annulee';
          visit_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      
      emergency_contacts: {
        Row: {
          id: string;
          patient_id: string;
          name: string;
          relationship: string;
          phone: string;
          email: string | null;
          is_primary: boolean;
          can_make_decisions: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          name: string;
          relationship: string;
          phone: string;
          email?: string | null;
          is_primary?: boolean;
          can_make_decisions?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          name?: string;
          relationship?: string;
          phone?: string;
          email?: string | null;
          is_primary?: boolean;
          can_make_decisions?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      
      assessments: {
        Row: {
          id: string;
          user_id: string;
          patient_id: string | null;
          category: 'senior' | 'maman_bebe';
          responses: Json;
          score: number;
          recommendations: string[];
          status: 'pending' | 'completed' | 'archived';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          patient_id?: string | null;
          category: 'senior' | 'maman_bebe';
          responses: Json;
          score?: number;
          recommendations?: string[];
          status?: 'pending' | 'completed' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          patient_id?: string | null;
          category?: 'senior' | 'maman_bebe';
          responses?: Json;
          score?: number;
          recommendations?: string[];
          status?: 'pending' | 'completed' | 'archived';
          created_at?: string;
          updated_at?: string;
        };
      };
      
      hospital_discharges: {
        Row: {
          id: string;
          patient_id: string;
          family_id: string;
          coordinator_id: string | null;
          hospital_name: string;
          hospital_service: string;
          doctor_name: string | null;
          discharge_date: string;
          discharge_time: string;
          status: 'pending' | 'assessing' | 'planned' | 'in_progress' | 'completed' | 'cancelled';
          assessment: Json | null;
          aidant_id: string | null;
          planned_visits: Json | null;
          actual_discharge_date: string | null;
          actual_discharge_time: string | null;
          installation_notes: string | null;
          family_notes: string | null;
          coordinator_notes: string | null;
          completed_at: string | null;
          satisfaction_rating: number | null;
          satisfaction_comment: string | null;
          recommendations: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          family_id: string;
          coordinator_id?: string | null;
          hospital_name: string;
          hospital_service: string;
          doctor_name?: string | null;
          discharge_date: string;
          discharge_time: string;
          status?: 'pending' | 'assessing' | 'planned' | 'in_progress' | 'completed' | 'cancelled';
          assessment?: Json | null;
          aidant_id?: string | null;
          planned_visits?: Json | null;
          actual_discharge_date?: string | null;
          actual_discharge_time?: string | null;
          installation_notes?: string | null;
          family_notes?: string | null;
          coordinator_notes?: string | null;
          completed_at?: string | null;
          satisfaction_rating?: number | null;
          satisfaction_comment?: string | null;
          recommendations?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          family_id?: string;
          coordinator_id?: string | null;
          hospital_name?: string;
          hospital_service?: string;
          doctor_name?: string | null;
          discharge_date?: string;
          discharge_time?: string;
          status?: 'pending' | 'assessing' | 'planned' | 'in_progress' | 'completed' | 'cancelled';
          assessment?: Json | null;
          aidant_id?: string | null;
          planned_visits?: Json | null;
          actual_discharge_date?: string | null;
          actual_discharge_time?: string | null;
          installation_notes?: string | null;
          family_notes?: string | null;
          coordinator_notes?: string | null;
          completed_at?: string | null;
          satisfaction_rating?: number | null;
          satisfaction_comment?: string | null;
          recommendations?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}