import type { SupabaseClient } from "@supabase/supabase-js";

import {
  parseDeveloperApplication,
  type DeveloperApplicationInput,
} from "@/lib/domain/developers/schema";
import type { Database } from "@/lib/db/types";

export type { DeveloperApplicationInput };

const OWN_PROFILE_COLUMNS =
  "display_name, city, bio, skills, service_scopes, starting_price_cents, portfolio_title, portfolio_description, portfolio_url, portfolio_image_url, contact, payout_subject_type, payout_subject_name, review_status, rejection_reason";

type DeveloperProfileRow = Database["public"]["Tables"]["developer_profiles"]["Row"];

export type DeveloperOwnProfile = Pick<
  DeveloperProfileRow,
  | "bio"
  | "city"
  | "contact"
  | "display_name"
  | "payout_subject_name"
  | "payout_subject_type"
  | "portfolio_description"
  | "portfolio_image_url"
  | "portfolio_title"
  | "portfolio_url"
  | "rejection_reason"
  | "review_status"
  | "service_scopes"
  | "skills"
  | "starting_price_cents"
>;

export async function getDeveloperOwnProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<DeveloperOwnProfile | null> {
  const { data, error } = await supabase
    .from("developer_profiles")
    .select(OWN_PROFILE_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as DeveloperOwnProfile | null;
}

export async function submitDeveloperApplication(
  supabase: SupabaseClient,
  input: DeveloperApplicationInput,
) {
  const application = parseDeveloperApplication(input);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("请先登录后再提交开发者认证");
  }

  const { error: roleError } = await supabase.rpc("apply_for_developer");

  if (roleError) {
    throw new Error(roleError.message);
  }

  const { data, error } = await supabase
    .from("developer_profiles")
    .update({
      display_name: application.displayName,
      headline: application.displayName,
      city: application.city,
      bio: application.bio,
      skills: application.skills,
      service_scopes: application.serviceScopes,
      starting_price_cents: application.startingPriceCents,
      hourly_rate_cents: application.startingPriceCents,
      portfolio_title: application.portfolio.title,
      portfolio_description: application.portfolio.description,
      portfolio_url: application.portfolio.url,
      portfolio_image_url: application.portfolio.imageUrl,
      contact: application.contact,
      payout_subject_type: application.payoutSubjectType,
      payout_subject_name: application.payoutSubjectName,
      review_status: "pending",
      rejection_reason: null,
    })
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
