import * as oidc from 'openid-client';
import type { GoogleOidcClient } from './google.client';

export function createAppleOidcClient(config: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): GoogleOidcClient {
  const configuration = new oidc.Configuration(
    {
      issuer: 'https://appleid.apple.com',
      authorization_endpoint: 'https://appleid.apple.com/auth/authorize',
      token_endpoint: 'https://appleid.apple.com/auth/token',
      jwks_uri: 'https://appleid.apple.com/auth/keys',
      id_token_signing_alg_values_supported: ['RS256'],
    },
    config.clientId,
    config.clientSecret,
    oidc.ClientSecretPost(config.clientSecret),
  );
  oidc.enableNonRepudiationChecks(configuration);
  return {
    async createAuthRequest() {
      const state = oidc.randomState();
      const nonce = oidc.randomNonce();
      const url = oidc.buildAuthorizationUrl(configuration, {
        redirect_uri: config.redirectUri,
        scope: 'openid email',
        response_mode: 'form_post',
        state,
        nonce,
      });
      // Apple does not support PKCE. State and nonce bind the response to this browser.
      return { url: url.href, state, nonce, codeVerifier: oidc.randomPKCECodeVerifier() };
    },
    async exchangeCode(params, expected) {
      const request = new Request(config.redirectUri, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: params,
      });
      const tokens = await oidc.authorizationCodeGrant(configuration, request, {
        expectedState: expected.state,
        expectedNonce: expected.nonce,
        idTokenExpected: true,
      });
      const claims = tokens.claims();
      if (!claims) throw new Error('Apple ID token missing');
      return {
        sub: claims.sub,
        email: typeof claims.email === 'string' ? claims.email : null,
        emailVerified: claims.email_verified === true || claims.email_verified === 'true',
        name: null,
        picture: null,
      };
    },
  };
}
