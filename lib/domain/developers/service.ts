import type { SupabaseClient } from "@supabase/supabase-js";

import {
  parseDeveloperApplication,
  type DeveloperApplicationInput,
} from "@/lib/domain/developers/schema";

export type { DeveloperApplicationInput };

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
