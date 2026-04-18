![](media/logo.png){width="1.0in" height="1.0in"}

**INVEGENT**

Privacy Policy

Invegent Publisher Application

Effective Date: 4 March 2026 \| Last Updated: 18 April 2026

1\. About This Policy

This Privacy Policy describes how Invegent (\"we\", \"us\", \"our\")
collects, uses, stores, and handles information in connection with the
Invegent Publisher application (\"the App\"). The App is a content
publishing tool that enables authorised users to schedule and publish
social media content to Facebook Pages on behalf of business clients.

This policy applies to:

- Operators and administrators using the Invegent Publisher App

- Business clients whose Facebook Pages are connected to the App

- Any person whose information is processed as part of operating the App

By using the App, you agree to the practices described in this policy.

2\. About Invegent

Invegent is a content intelligence platform operated as a sole trader
business based in New South Wales, Australia. The platform ingests
industry signals, scores and synthesises relevant content, and publishes
social media posts on behalf of business clients --- primarily in the
NDIS and property sectors.

Contact: hello@invegent.com

Website: invegent.com

ABN: 39 769 957 807

3\. What Permissions the App Uses

The Invegent Publisher App connects to Facebook via the Meta Graph API.
The App requests the following permissions:

pages_manage_posts

Allows the App to create, edit, and delete posts on Facebook Pages that
the user has authorised. This is used to publish drafted social media
content to client Pages.

pages_read_engagement

Allows the App to read engagement data (likes, comments, shares) on
posts published through the App. This is used to monitor content
performance and inform future content decisions.

pages_show_list

Allows the App to retrieve the list of Facebook Pages that the
authorised user manages. This is used to identify and connect the
correct Page for each client.

The App does not request permissions beyond those listed above. It does
not access personal Facebook profiles, friends lists, private messages,
or any data outside of the Pages the user explicitly authorises.

4\. What Data the App Collects and Why

4.1 Data Collected from Facebook

When a Facebook Page is connected to the App, the following data may be
collected:

- Page access tokens --- used to authenticate publishing requests to
  Facebook on behalf of the Page

- Page IDs and Page names --- used to route content to the correct Page

- Post engagement metrics (likes, comments, shares, reach) --- used to
  evaluate content performance

- Publish confirmation data (post IDs, timestamps) --- used to maintain
  an audit trail of published content

We do not collect, store, or process personal user profile data, friend
lists, private messages, or any data from personal Facebook accounts.

4.2 Data Collected from App Operators

For operators and administrators using the App, we may collect:

- Name and email address --- for account access and support
  communications

- Client configuration details --- business name, social media Page
  identifiers, content preferences

- Usage logs --- actions taken within the App for audit and debugging
  purposes

4.3 Content Signal Data

The App processes content sourced from publicly available industry news
feeds, RSS feeds, YouTube public channels, and other public sources.
This content is used to identify topics, generate social media posts,
and inform editorial decisions. We do not collect personal information
from these sources beyond what is already publicly published at the
source itself (for example, author by-lines on public blog posts).

For YouTube public data specifically, the App uses the YouTube Data API
v3 to retrieve channel and video metadata (channel lists, video lists,
video titles, publish dates, public captions) for the purpose of feed
discovery and content signal identification. Only publicly available
videos from publicly accessible channels are accessed. Private videos,
age-restricted videos, and content requiring authentication are not
accessed.

4.4 Video Transcript Processing

The App includes a video analysis capability that processes transcripts
from publicly available YouTube videos to extract content signals
(topics, themes, and subject references) that may inform social media
content generation. This process:

- Retrieves transcripts only from videos that are publicly available

- Processes transcripts to identify topics and signals, not to store
  their full text beyond the processing window

- Does not retain transcript text beyond 24 hours of processing

- Does not associate transcript data with any personal identifier

- Does not process any video that is private, restricted, or requires
  authentication to access

Only the derived topic and signal metadata --- not the transcript text
itself --- is retained in our systems beyond the 24-hour processing
window.

4.5 Avatar Generation Capability

The App includes an integration with HeyGen (heygen.com), an AI avatar
and video generation service. At the current version of the App this
capability is used only for internal product development and is not
exposed to clients or their audiences.

Before any avatar-generated content becomes part of client-facing
services, we will:

- Obtain explicit, informed consent from the relevant client prior to
  generating any avatar content in their business context

- Not include any personal likeness, voice, or biometric data without
  separate, specific, written consent

- Disclose on any published content that AI avatar generation was used,
  where platform policy or regulatory framework requires disclosure

Until such consent has been obtained, HeyGen integration remains a
backend-only development capability and does not process or output
content associated with any client, participant, or individual.

5\. How We Use Data

Data collected through the App is used solely for the following
purposes:

- Publishing social media content to authorised Facebook Pages

- Monitoring and reporting on content performance for client reporting

- Maintaining an audit trail of publishing activity

- Diagnosing and resolving technical issues

- Improving the reliability and quality of the App

We do not sell, rent, or share your data with third parties for
advertising or marketing purposes. We do not use your data to build
advertising profiles.

6\. How We Store and Protect Data

All data is stored in a managed PostgreSQL database hosted by Supabase
(supabase.com), with servers located in the Asia Pacific (Sydney)
region. Supabase is SOC 2 Type II certified.

We apply the following measures to protect data:

- Encrypted connections (TLS/HTTPS) for all data in transit

- Database access restricted to authorised application services only

- Facebook Page access tokens stored as encrypted secrets, not in plain
  text

- Access to the production database and application is restricted to the
  Invegent operator

We retain publishing records, logs, and performance data for up to 24
months. Access tokens are rotated in accordance with Meta\'s token
expiry requirements. Video transcript text is retained for no more than
24 hours following processing (see Section 4.4).

7\. Third-Party Services

The App integrates with the following third-party services. Each has its
own privacy policy:

**Meta (Facebook) Graph API** --- used to publish content and read Page
engagement. Privacy Policy: facebook.com/policy

**Supabase** --- database hosting provider. Privacy Policy:
supabase.com/privacy

**Anthropic Claude API** --- AI model used to generate post content from
source signals. Privacy Policy: anthropic.com/privacy

**OpenAI API** --- AI model used as a fallback for content generation.
Privacy Policy: openai.com/policies/privacy-policy

**Google (YouTube Data API)** --- used to retrieve publicly available
YouTube channel and video metadata for feed discovery and content signal
identification. Privacy Policy: policies.google.com/privacy

**HeyGen** --- AI avatar and video generation service. Currently used
only as a backend development capability and not exposed in
client-facing services at the current version of the App. Privacy
Policy: heygen.com/privacy

We do not share personal data with these services beyond what is
necessary for the App to function.

8\. Your Rights

You have the right to:

- Request access to the data we hold about you

- Request correction of inaccurate data

- Request deletion of your data (see Section 9 below)

- Withdraw consent and disconnect your Facebook Page from the App at any
  time

To exercise any of these rights, contact us at hello@invegent.com. We
will respond within 30 days.

If you are located in Australia, you also have rights under the Privacy
Act 1988 (Cth) and the Australian Privacy Principles. You may lodge a
complaint with the Office of the Australian Information Commissioner
(OAIC) at oaic.gov.au.

9\. Data Deletion

You may request deletion of your data at any time. To do so:

**Option 1 --- Email request:** Send a deletion request to
hello@invegent.com with the subject line \"Data Deletion Request\".
Include your name and the Facebook Page(s) connected to the App. We will
complete deletion within 30 days and confirm by email.

**Option 2 --- Revoke via Facebook:** You can revoke the App\'s access
to your Facebook Page at any time via Facebook Settings \> Apps and
Websites. Revoking access will prevent the App from publishing to your
Page. We will delete associated tokens and configuration data within 30
days.

Upon deletion, we will remove:

- Your Facebook Page access tokens

- Client configuration data associated with your account

- Publishing history and performance data linked to your Page

We may retain anonymised aggregate statistics (not linked to any
individual or Page) for internal reporting purposes.

10\. Children\'s Privacy

The Invegent Publisher App is designed for use by businesses and
professional operators. It is not directed at individuals under the age
of 18. We do not knowingly collect data from minors.

11\. Changes to This Policy

We may update this Privacy Policy from time to time. When we do, we will
update the \"Last Updated\" date at the top of this page. Where changes
are material, we will notify active users by email.

Continued use of the App following any update constitutes acceptance of
the revised policy.

Revision history:

**4 March 2026** --- Initial publication.

**18 April 2026** --- Expanded Section 4.3 (Content Signal Data) to
cover YouTube public data used for feed discovery. Added Section 4.4
(Video Transcript Processing) covering the 24-hour retention limit for
transcript text. Added Section 4.5 (Avatar Generation Capability)
covering HeyGen integration and the explicit-consent requirement before
any client-facing use. Updated Section 6 retention note to reflect
Section 4.4. Updated Section 7 to include Google (YouTube Data API) and
HeyGen as third-party service providers.

12\. Contact Us

For any questions, requests, or complaints regarding this Privacy Policy
or the App\'s data practices, please contact:

**Invegent**

Email: hello@invegent.com

Website: invegent.com

Location: New South Wales, Australia

We take privacy seriously and will respond to all enquiries within 30
days.

Invegent \| New South Wales, Australia \| hello@invegent.com \|
invegent.com
