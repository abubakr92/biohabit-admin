import { GoogleAuth } from 'google-auth-library';

/** The client's GA4 property (shared 16 Nov). Not a secret: it is visible to anyone with access to it. */
export const GA4_PROPERTY_ID = process.env.GA4_PROPERTY_ID || '549144978';

let client: Awaited<ReturnType<GoogleAuth['getClient']>> | undefined;

/**
 * Account deletion, Analytics step: asks GA4 to delete everything recorded for this phone's app
 * instance. The app sends no user ID to Analytics, so the app instance ID is the only handle, and
 * the app stores it on the profile as `analyticsAppInstanceId` only for members who opted in.
 * Without it there is nothing in Analytics to tie to the account, and nothing to request.
 *
 * Needs the functions' service account to hold the Editor role on the property.
 */
export async function requestAnalyticsDeletion(appInstanceId: unknown): Promise<'requested' | 'none'> {
  if (typeof appInstanceId !== 'string' || !appInstanceId.trim()) return 'none';
  client ??= await new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/analytics.edit'] }).getClient();
  await client.request({
    url: `https://analyticsadmin.googleapis.com/v1alpha/properties/${GA4_PROPERTY_ID}:submitUserDeletion`,
    method: 'POST',
    data: { appInstanceId: appInstanceId.trim() },
  });
  return 'requested';
}
