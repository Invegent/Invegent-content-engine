#!/bin/bash
# ========================================================================
# Delete 18 cross-posted IG posts from NDIS Yarns Instagram
# ========================================================================
# 
# CONTEXT: On 19 April 2026, instagram-publisher v1.0.0 published 18 IG
# posts to NDIS Yarns @ndisyarns Instagram. ALL 18 were cross-posted from
# Facebook drafts (pd.platform='facebook' but IG container created from
# the FB draft body + image_url). Root cause: M12 bug — instagram-publisher
# queries m.post_draft directly without filtering pd.platform='instagram'.
# 
# These posts contain FB-shaped content (longer captions, FB tone, hashtag
# patterns optimised for FB not IG). They need to be removed from the IG
# account before any new IG content is published.
# 
# REQUIREMENTS:
#   - NY page access token with instagram_content_publish + 
#     instagram_manage_insights scopes (deletion uses pages_manage_posts
#     equivalent for IG via the page's IG Business Account permissions)
#   - Token must be the long-lived NY page token, not the user token
# 
# USAGE:
#   1. Get NY page access token from Supabase:
#      SELECT page_access_token FROM c.client_publish_profile 
#      WHERE client_id = 'fb98a472-ae4d-432d-8738-2273231c1ef4'::uuid
#        AND platform = 'instagram';
#   2. Export it: export NY_IG_TOKEN='paste_token_here'
#   3. Run: bash scripts/delete_ny_ig_crosspost_cleanup_20260419.sh
#   4. Watch output. Each deletion returns {"success":true} on success.
# 
# SAFETY:
#   - This script ONLY deletes the 18 specific media IDs listed below.
#   - It does NOT touch any other content on the IG account.
#   - It does NOT modify the m.post_publish records — those remain as
#     historical record. (Optional: separate migration to mark them
#     'deleted_from_platform' if needed.)
# 
# ========================================================================

set -euo pipefail

if [ -z "${NY_IG_TOKEN:-}" ]; then
  echo "ERROR: NY_IG_TOKEN environment variable not set"
  echo "Export it first: export NY_IG_TOKEN='your_token_here'"
  exit 1
fi

# 18 IG media IDs from 19 April cross-post incident, in chronological order
IG_MEDIA_IDS=(
  "18059807273476954"  # 12:30 — When dementia care shifts from managing to understanding
  "18109094788803103"  # 13:15 — NSW foundational supports consultation
  "18071278490297970"  # 13:15 — Thriving Kids rollout: timelines
  "18096822992048253"  # 13:30 — Community Visitor Schemes: national standards
  "18098175296017192"  # 13:30 — What if the behaviour is communication
  "17987055332965094"  # 14:00 — Thriving Kids rollout timelines
  "17996748383763958"  # 14:00 — NDIS reform pressure before Federal Budget
  "18007034186856697"  # 14:15 — Thriving Kids timelines starting to take shape
  "18078493178393805"  # 14:15 — What if the behaviour is actually communication
  "18122786212715891"  # 14:30 — Community Visitor Schemes: national consistency
  "18112414657808516"  # 14:30 — NSW foundational supports: families
  "18114045667689651"  # 14:45 — NDIS reform pressure
  "18321500404266191"  # 14:45 — What if the behaviour is actually communication
  "17849870463676052"  # 15:00 — Thriving Kids timelines now real
  "18182116393384228"  # 15:30 — NDIS reform debate
  "17999407478875649"  # 15:30 — When behaviour is communication
  "18102244058501057"  # 15:45 — NSW families: help children sooner
  "18087520979205521"  # 16:00 — NSW foundational supports
)

GRAPH_BASE="https://graph.facebook.com/v19.0"
SUCCESS_COUNT=0
FAIL_COUNT=0
FAILED_IDS=()

echo "================================================================="
echo "Deleting 18 cross-posted IG media from NDIS Yarns Instagram"
echo "================================================================="
echo ""

for i in "${!IG_MEDIA_IDS[@]}"; do
  num=$((i + 1))
  media_id="${IG_MEDIA_IDS[$i]}"
  echo -n "[$num/18] Deleting $media_id ... "
  
  response=$(curl -s -X DELETE "${GRAPH_BASE}/${media_id}?access_token=${NY_IG_TOKEN}")
  
  if echo "$response" | grep -q '"success":true'; then
    echo "OK"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo "FAILED"
    echo "  Response: $response"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_IDS+=("$media_id")
  fi
  
  # Small delay to be polite to Meta API
  sleep 0.5
done

echo ""
echo "================================================================="
echo "Summary"
echo "================================================================="
echo "Successful: $SUCCESS_COUNT / 18"
echo "Failed: $FAIL_COUNT / 18"

if [ "$FAIL_COUNT" -gt 0 ]; then
  echo ""
  echo "Failed media IDs:"
  for id in "${FAILED_IDS[@]}"; do
    echo "  - $id"
  done
  echo ""
  echo "Common failure reasons:"
  echo "  - Token lacks instagram_content_publish scope"
  echo "  - Media already deleted manually"
  echo "  - Token expired (check token_expires_at in Supabase)"
  exit 1
fi

echo ""
echo "All 18 cross-posted IG posts deleted successfully."
echo "Next step: run the post-deletion verification migration to mark"
echo "the m.post_publish records with deleted_from_platform timestamp."
