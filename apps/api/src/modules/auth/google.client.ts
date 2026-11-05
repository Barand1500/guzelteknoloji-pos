import * as oidc from 'openid-client';

export interface GoogleAuthRequest {
  url: string;
  state: string;
  nonce: string;
  codeVerifier: string;
}

/** Google ID token'ından, imza/aud/iss/exp/nonce doğrulaması SONRASI elde edilen alanlar. */
export interface GoogleClaims {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

export interface GoogleOidcClient {
  createAuthRequest(): Promise<GoogleAuthRequest>;
  exchangeCode(
    callbackQuery: URLSearchParams,
    expected: { state: string; nonce: string; codeVerifier: string },
  ): Promise<GoogleClaims>;
}

const GOOGLE_ISSUER = new URL('https://accounts.google.com');

export function createGoogleOidcClient(config: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): GoogleOidcClient {
  // Discovery belgesi bir kez alınıp önbelleğe konur; hata olursa sonraki istekte yeniden denenir.
  let discovered: Promise<oidc.Configuration> | null = null;
  const getConfig = () => {
    discovered ??= oidc
      .discovery(GOOGLE_ISSUER, config.clientId, config.clientSecret)
      .then((configuration) => {
        oidc.enableNonRepudiationChecks(configuration);
        return configuration;
      })
      .catch((error: unknown) => {
        discovered = null;
        throw error;
      });
    return discovered;
  };

  return {
    async createAuthRequest() {
      const configuration = await getConfig();
      const codeVerifier = oidc.randomPKCECodeVerifier();
      const state = oidc.randomState();
      const nonce = oidc.randomNonce();
      const url = oidc.buildAuthorizationUrl(configuration, {
        redirect_uri: config.redirectUri,
        scope: 'openid email profile',
        code_challenge: await oidc.calculatePKCECodeChallenge(codeVerifier),
        code_challenge_method: 'S256',
        state,
        nonce,
        prompt: 'select_account',
      });
      return { url: url.href, state, nonce, codeVerifier };
    },

    async exchangeCode(callbackQuery, expected) {
      const configuration = await getConfig();
      // Callback URL'i Host başlığından DEĞİL, yapılandırılmış redirect URI'den kurulur.
      const currentUrl = new URL(config.redirectUri);
      callbackQuery.forEach((value, key) => currentUrl.searchParams.set(key, value));

      // openid-client: token takası + ID token imza, iss, aud, exp ve nonce doğrulaması.
      const tokens = await oidc.authorizationCodeGrant(configuration, currentUrl, {
        pkceCodeVerifier: expected.codeVerifier,
        expectedState: expected.state,
        expectedNonce: expected.nonce,
        idTokenExpected: true,
      });
      const claims = tokens.claims();
      if (!claims) throw new Error('ID token alınamadı.');

      const str = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : null);
      return {
        sub: claims.sub,
        email: str(claims.email),
        emailVerified: claims.email_verified === true,
        name: str(claims.name),
        picture: str(claims.picture),
      };
    },
  };
}
