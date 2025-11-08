const OAUTH_STORAGE_KEY = 'ukx::oauthUsers';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour

const PROVIDERS = {
    google: {
        key: 'google',
        label: 'Google',
        latency: 600,
        scope: 'openid profile email',
        defaults: { firstName: 'Google', lastName: 'User' }
    },
    facebook: {
        key: 'facebook',
        label: 'Facebook',
        latency: 750,
        scope: 'public_profile email',
        defaults: { firstName: 'Facebook', lastName: 'User' }
    }
};

export const OAUTH_ERROR_CODES = Object.freeze({
    CANCELLED: 'OAUTH_CANCELLED',
    INVALID_EMAIL: 'OAUTH_INVALID_EMAIL'
});

export async function startMockOAuthFlow(providerKey, { action = 'login' } = {}) {
    const provider = PROVIDERS[providerKey];
    if (!provider) {
        throw new Error(`Unsupported OAuth provider: ${providerKey}`);
    }

    return new Promise((resolve, reject) => {
        try {
            const email = askForEmail(provider, action);
            const profile = createProfileFromEmail(email, provider);
            const session = createSession(provider);

            setTimeout(() => {
                resolve({
                    provider,
                    profile,
                    session
                });
            }, provider.latency);
        } catch (error) {
            reject(error);
        }
    });
}

export function getStoredOAuthUsers() {
    if (typeof window === 'undefined' || !window.localStorage) {
        return [];
    }

    const raw = window.localStorage.getItem(OAUTH_STORAGE_KEY);
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('[mock-oauth] Failed to parse stored OAuth users, resetting store.', error);
        window.localStorage.removeItem(OAUTH_STORAGE_KEY);
        return [];
    }
}

export function findOAuthUserByEmail(email, providerKey) {
    if (!email) {
        return null;
    }

    const normalizedEmail = email.trim().toLowerCase();
    return getStoredOAuthUsers().find(user => {
        const sameEmail = user.normalizedEmail === normalizedEmail;
        return providerKey ? sameEmail && user.provider === providerKey : sameEmail;
    }) || null;
}

export function upsertOAuthUser(profile) {
    const users = getStoredOAuthUsers();
    const normalizedEmail = profile.email.trim().toLowerCase();
    const index = users.findIndex(user => user.normalizedEmail === normalizedEmail && user.provider === profile.provider);
    const timestamp = new Date().toISOString();

    const record = {
        id: profile.id || createUserId(profile.provider),
        provider: profile.provider,
        providerLabel: profile.providerLabel,
        email: profile.email,
        normalizedEmail,
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatar: profile.avatar || null,
        updatedAt: timestamp,
        createdAt: profile.createdAt || (index === -1 ? timestamp : users[index].createdAt),
        lastLoginAt: profile.lastLoginAt || timestamp
    };

    if (index === -1) {
        users.push(record);
    } else {
        users[index] = { ...users[index], ...record };
    }

    persistUsers(users);
    return record;
}

function persistUsers(users) {
    if (typeof window === 'undefined' || !window.localStorage) {
        return;
    }

    window.localStorage.setItem(OAUTH_STORAGE_KEY, JSON.stringify(users));
}

function askForEmail(provider, action) {
    const message = [
        `${provider.label} authorization (${action})`,
        'Because this is a front-end only demo, please enter an email address to simulate the OAuth consent screen.',
        'We will treat that email as the one shared by the provider.'
    ].join('\n\n');

    const response = window.prompt(message, '');
    if (response === null) {
        const cancelError = new Error(`${provider.label} authorization cancelled.`);
        cancelError.code = OAUTH_ERROR_CODES.CANCELLED;
        throw cancelError;
    }

    const email = response.trim();
    if (!EMAIL_REGEX.test(email)) {
        const invalidError = new Error('Please enter a valid email address to continue.');
        invalidError.code = OAUTH_ERROR_CODES.INVALID_EMAIL;
        throw invalidError;
    }

    return email;
}

function createProfileFromEmail(email, provider) {
    const names = deriveNames(email, provider.defaults);
    return {
        id: createUserId(provider.key),
        email,
        firstName: names.firstName,
        lastName: names.lastName,
        provider: provider.key,
        providerLabel: provider.label,
        avatar: null
    };
}

function deriveNames(email, defaults) {
    const localPart = email.split('@')[0];
    const tokens = localPart.replace(/[\d._-]+/g, ' ').split(' ').filter(Boolean);

    const firstName = tokens[0] ? capitalize(tokens[0]) : defaults.firstName;
    const lastName = tokens.length > 1 ? capitalize(tokens[tokens.length - 1]) : defaults.lastName;

    return { firstName, lastName };
}

function capitalize(value) {
    if (!value) {
        return '';
    }
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function createSession(provider) {
    const now = Date.now();
    return {
        provider: provider.key,
        providerLabel: provider.label,
        tokenType: 'Bearer',
        accessToken: generateRandomToken(32),
        refreshToken: generateRandomToken(40),
        scope: provider.scope,
        issuedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + DEFAULT_SESSION_DURATION_MS).toISOString()
    };
}

function generateRandomToken(byteLength) {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const bytes = new Uint8Array(byteLength);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    return Array.from({ length: byteLength }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function createUserId(providerKey) {
    return `${providerKey}-user-${generateRandomToken(6)}`;
}
