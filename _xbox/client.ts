import { AuthorizationData } from "./globals";
import { RESTful } from "./RESTful";
/** A type representing an Xbox User ID */
type XUID = string;

type UserSettings = ("GameDisplayPicRaw" | "Gamerscore" | "Gamertag" | "AccountTier" | "XboxOneRep" | "PreferredColor" | "RealName" | "Bio" | "Location" | "ModernGamertag" | "ModernGamertagSuffix" | "UniqueModernGamertag" | "RealNameOverride" | "TenureLevel" | "Watermarks" | "IsQuarantined" | "DisplayedLinkedAccounts")

type AchievementOptions = { skipItems?: boolean, continuationToken?: string, maxItems?: number, titleId?: number, unlockedOnly?: boolean, possibleOnly?: boolean, types?: "Persistent" | "Challenge", orderBy?: "Default" | "UnlockTime" | "Gamerscore", order?: "Ascending" | "Descending" }
type AchievementsResponse = {
    achievements: {
        id: string;
        serviceConfigId: string;
        name: string;
        titleAssociations: {
            name: string;
            id: number;
            version: string;
        }[];
        progressState: string;
        progression: {
            achievementState: string;
            requirements: null;
            timeUnlocked: string;
        };
        mediaAssets: {
            name: string;
            type: string;
            url: string;
        }[];
        platform: string;
        isSecret: boolean;
        description: string;
        lockedDescription: string;
        productId: string;
        achievementType: string;
        participationType: string;
        timeWindow: {
            startDate: string;
            endDate: string;
        };
        rewards: {
            name: string | null;
            description: string | null;
            value: string;
            type: string;
            valueType: string;
        }[];
        estimatedTime: string;
        deeplink: string;
        isRevoked: boolean;
    }[];
    pagingInfo: {
        continuationToken: string | null;
        totalRecords: number;
    };
};

type GetGroupBroadcastingCountResponse = {
    count: number
}

type PresenceRecord = {
    xuid: string;
    state: string;
    lastSeen?: {
        deviceType: string;
        titleId: string;
        titleName: string;
        timestamp: string;
    };
    devices?: {
        type: string;
        titles: {
            id: string;
            name: string;
            state: string;
            placement: string;
            timestamp: string;
            activity?: {
                richPresence: string;
            };
        }[];
    }[];
};

type BroadCastingPresenceRecord = {
    xuid: string;
    state: string;
    lastSeen?: {
        deviceType: string;
        titleId: string;
        titleName: string;
        timestamp: string;
    };
    devices?: {
        type: string;
        titles: {
            id: string;
            name: string;
            state: string;
            placement: string;
            timestamp: string;
            activity?: {
                richPresence: string;
                broadcast:
                {
                    id: string,
                    session: string,
                    provider: string,
                    started: string,
                    viewers: number,
                }
            };
        }[];
    }[];
}[];


type GetActivityResponse = {
    "connectionString": string,
    "currentPlayers": number,
    "groupId": string,
    "joinRestriction": {
        "Followed": string,
        "InviteOnly": string,
        "Public": string
    },
    "maxPlayers": number,
    "platform": {
        "Android": string,
        "IOS": string,
        "Nintendo": string,
        "PlayStation": string
    },
    "sequenceNumber": string,
    "titleId": number
}

type UpdateMultiplayerActivity = {
    "connectionString": string,
    "joinRestriction": {
        "Followed": string,
        "InviteOnly": string,
        "Public": string
    },
    "sequenceNumber": string,
    "currentPlayers": number,
    "groupId": string,
    "maxPlayers": number,
    "platform": {
        "Android": string,
        "IOS": string,
        "Nintendo": string,
        "PlayStation": string,
        "Scarlett": string,
        "Win32": string,
        "WindowsOneCore": string,
        "XboxOne": string
    },
    "titleId": number
}

type UpdateMultiplayerActivityResponse = {
    "connectionString": string,
    "currentPlayers": number,
    "groupId": string,
    "joinRestriction": {
        "Followed": string,
        "InviteOnly": string,
        "Public": string
    },
    "maxPlayers": number,
    "platform": {
        "Android": string,
        "IOS": string,
        "Nintendo": string,
        "PlayStation": string
    },
    "sequenceNumber": string
}

type GetFollowersXUIDsResponse = {
   "totalCount": number,
    "people": any[], 
    "incomingFriendRequestsCount": number | null,
}

type levels = 'user' | 'device' | 'title' | 'all'

export class Client {
    private authorizationData: AuthorizationData;
    private restful: RESTful;
    private XBL: string;
    constructor(authorizationData: AuthorizationData) {
        this.authorizationData = authorizationData;
        this.XBL = `XBL3.0 x=${authorizationData.userHash};${authorizationData.XSTSToken}`;

        this.restful = new RESTful({
            headers: {
                "x-xbl-contract-version": 2 as unknown as string,
                "content-type": "application/json",
                "accept-language": "en-US",
                "accept": "application/json",
                "Authorization": this.XBL,
                'host': 'userpresence.xboxlive.com',
            }
        })
    }


    public get users() {
        const restful = this.restful;
        return {
            async getSettings(XUIDs: XUID[], options: UserSettings[]): Promise<Record<XUID, Record<string, any>>> {
                const response = await restful.post('https://profile.xboxlive.com/users/batch/profile/settings', {
                    body: JSON.stringify({
                        "userIds": XUIDs,
                        "settings": options
                    })
                });

                if (!response.ok) {

                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to fetch user settings ${JSON.stringify(errorDisplayed, null, 4)}:`);
                }

                const data = await response.json();
                const userSettings = {};

                for (const user of data.profileUsers) {
                    const settingsMap = {};

                    for (const setting of user.settings) {
                        settingsMap[setting.id] = setting.value;
                    }

                    userSettings[user.id] = settingsMap;
                }
                return userSettings;
            },

            async getAchievements(XUID: XUID, options: AchievementOptions = {}): Promise<AchievementsResponse> {
                // convert options to url string params;
                const params = new URLSearchParams();
                for (const key in options) {
                    params.append(key, String(options[key]));
                }
                const response = await restful.get(`https://achievements.xboxlive.com/users/xuid(${XUID})/achievements${params.toString()}`, {});

                if (!response.ok) {

                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to fetch user achievements ${JSON.stringify(errorDisplayed, null, 4)}:`);
                }
                return (await response.json())
            },

            async getXUID(username: string): Promise<XUID> {
                const response = await restful.get(`https://profile.xboxlive.com/users/gt(${encodeURIComponent(username)})/settings`);
                if (!response.ok) {
                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to fetch xuid ${JSON.stringify(errorDisplayed, null, 4)}:`);
                }
                return (await response.json()).profileUsers[0].id;
            },
            // Achievement Title History URIs <achievements.xboxlive.com> | <https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/reference/live/rest/uri/titlehistory/atoc-reference-titlehistoryv2>
            async getAchievementTitleHistory(XUID: XUID, options?: { skipItems?: number, continuationToken?: string, maxItems?: number }): Promise<any> {
                const params = new URLSearchParams();
                for (const key in options) {
                    params.append(key, String(options[key]));
                }
                const response = await restful.get(`https://achievements.xboxlive.com/users/xuid(${XUID})/history/titles${params.size > 0 ? `?${params.toString()}` : ''}`);
                if (!response.ok) {
                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to fetch achievement title history: ${JSON.stringify(errorDisplayed, null, 4)} `);
                }
                return await response.json();
            }
        }
    }

    public get presence() {
        const restful = this.restful;
        const XBL = this.XBL;
        return {
            async getCurrentPresence(): Promise<PresenceRecord> {
                const response = await restful.get('https://userpresence.xboxlive.com/users/me', {});

                if (!response.ok) {
                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to fetch user presence ${JSON.stringify(errorDisplayed, null, 4)}:`);
                }
                return (await response.json()) as PresenceRecord;
            },

            async getBatchUserPresence(XUIDs: string[]): Promise<PresenceRecord[]> {
                if (!Array.isArray(XUIDs) || XUIDs.length === 0) {
                    throw new Error("XUIDs must be an array with at least one xuid of a user.");
                }

                const response = await restful.post('https://userpresence.xboxlive.com/users/batch', {
                    body: JSON.stringify({
                        users: XUIDs,
                    })
                })

                if (!response.ok) {
                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to fetch user presence ${JSON.stringify(errorDisplayed, null, 4)}:`);
                }

                return (await response.json()) as PresenceRecord[];
            },
            async getCurrentGroupPresence(level: levels): Promise<PresenceRecord[]> {
                const response = await restful.get(`https://userpresence.xboxlive.com/users/me/groups/people?level=${level}`, {});

                if (!response.ok) {
                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to fetch user presence ${JSON.stringify(errorDisplayed, null, 4)}:`);
                }

                return (await response.json()) as PresenceRecord[];
            },

            async updateTitlePresence(xuid: string, id: string, placement: string, state: string): Promise<any> {
                const response = await restful.post(`https://userpresence.xboxlive.com/users/xuid(${xuid})/devices/current/titles/current`, {
                    body: JSON.stringify({ id, placement, state })
                });

                if (!response.ok) {
                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to fetch user presence ${JSON.stringify(errorDisplayed, null, 4)}:`);
                }

                return await response.json();
            },
            async removeTitlePresence(xuid: string, titleId: string, deviceId?: string, deviceType?: string): Promise<void> {
                const response = await restful.delete(`https://userpresence.xboxlive.com/users/xuid(${xuid})/devices/current/titles/${titleId}`, {
                    headers: {
                        "Authorization": XBL,
                        "x-xbl-contract-version": 3 as unknown as string,
                        "Host": "userpresence.xboxlive.com",
                        ...(deviceId && { "deviceId": deviceId }),
                        ...(deviceType && { "deviceType": deviceType }),
                    }
                });
                if (!response.ok) {
                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to fetch user presence ${JSON.stringify(errorDisplayed, null, 4)}:`);
                }
                return await response.json();
            },
            async getGroupPresence(xuid: string, level: levels): Promise<PresenceRecord[]> {
                const response = await restful.get(`https://userpresence.xboxlive.com/users/xuid(${xuid})/groups/People?level=${level}`, {
                    headers: {
                        "Authorization": XBL,
                        "x-xbl-contract-version": 3 as unknown as string,
                        "Host": "userpresence.xboxlive.com",
                        "Accept-Language": "en-US",
                        "Accept": "application/json",
                    }
                });

                if (!response.ok) {
                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to fetch user presence ${JSON.stringify(errorDisplayed, null, 4)}:`);
                }

                return (await response.json()) as PresenceRecord[];
            },
            async getGroupBroadcastingPresence(xuid: string, level: levels): Promise<BroadCastingPresenceRecord> {
                const response = await restful.get(`https://userpresence.xboxlive.com/users/xuid(${xuid})/groups/People/broadcasting?level=${level}`, {
                    headers: {
                        "Authorization": XBL,
                        "x-xbl-contract-version": 3 as unknown as string,
                        "Host": "userpresence.xboxlive.com",
                        "Accept-Language": "en-US",
                        "Accept": "application/json",
                    }
                });

                if (!response.ok) {
                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to fetch user presence ${JSON.stringify(errorDisplayed, null, 4)}:`);
                }

                return (await response.json()) as BroadCastingPresenceRecord;
            },
            async getGroupBroadcastingCount(xuid: string, level: string = 'title'): Promise<GetGroupBroadcastingCountResponse> { 
                const response = await restful.get(`https://userpresence.xboxlive.com/users/xuid(${xuid})/groups/People/broadcasting/count?level=${level}`, {
                    headers: {
                        "Authorization": XBL,
                        "x-xbl-contract-version": 3 as unknown as string,
                        "Host": "userpresence.xboxlive.com",
                        "Accept-Language": "en-US",
                        "Accept": "application/json",
                    }
                })
                if (!response.ok) {
                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to fetch user presence ${JSON.stringify(errorDisplayed, null, 4)}:`);
                }

                return (await response.json()) as { count: number };
            }
        }
    }

    public get multiplayer() {
        const restful = this.restful;
        return {
            async getMultiplayerActivity(titleId: number, XUID: XUID): Promise<GetActivityResponse> {
                const response = await restful.get(`https://multiplayeractivity.xboxlive.com/titles/${titleId}/users/${XUID}/activities`);
                if (!response.ok) {

                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to fetch multiplayer activity ${JSON.stringify(errorDisplayed, null, 4)}:`);
                }
                return await response.json();
            },
            async updateMultiplayerActivity(titleId: number, XUID: XUID, activity: UpdateMultiplayerActivity): Promise<UpdateMultiplayerActivityResponse> {
                const response = await restful.put(`https://multiplayeractivity.xboxlive.com/titles/${titleId}/users/${XUID}/activities`, {
                    body: JSON.stringify(activity)
                });
                if (!response.ok) {

                    throw new Error(`Failed to update multiplayer activity:`);
                }
                return (await response.json());
            },
            async deleteMultiplayerActivity(titleId: number, XUID: XUID, sequenceNumber: string): Promise<void> {
                const response = await restful.delete(`https://multiplayeractivity.xboxlive.com/titles/${titleId}/users/${XUID}/activities`, {
                    body: JSON.stringify({ sequenceNumber })
                });
                if (!response.ok) {

                    throw new Error(`Failed to delete multiplayer activity:`);
                }
                return;
            }

        }
    }

    public get social() {
        // People URIs <social.xboxlive.com> | <https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/reference/live/rest/uri/people/atoc-reference-people>
        const restful = this.restful;
        const XBL = this.XBL;
        return {
            async getFollowers(XUID: XUID, options: { view: ("All" | "Favorite" | "LegacyXboxLiveFriends"), maxItems: number, startIndex: number }): Promise<{ "people": { "xuid": XUID, "isFavorite": boolean, "isFollowingCaller": boolean, "socialNetworks"?: string[] }, "totalCount": number }> {
                const params = new URLSearchParams();
                for (const key in options) {
                    params.append(key, String(options[key]));
                }

                const response = await restful.get(`https://social.xboxlive.com/users/xuid(${XUID})/people${params.size > 0 ? `?${params.toString()}` : ''}`);
                if (!response.ok) {

                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to fetch followers: ${JSON.stringify(errorDisplayed, null, 4)}`);
                }
                return await response.json();
            },
            async getFollowersAsUser(userXUID: XUID, targetXUID: XUID): Promise<{ "xuid": XUID, "isFavorite": boolean, "isFollowingCaller": boolean, "socialNetworks"?: string[] }> {
                const response = await restful.post(`https://social.xboxlive.com/users/${userXUID}/people/${targetXUID}`, {
                    "headers": {
                        "XUID": userXUID,
                    }
                });
                if (!response.ok) {

                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to fetch following: ${JSON.stringify(errorDisplayed, null, 4)}`);
                }
                return await response.json();
            },

            async getFollowersXUIDs(XUID: XUID, XUIDS: string[]): Promise<GetFollowersXUIDsResponse> {
                const response = await restful.post(`https://social.xboxlive.com/users/xuid(${XUID})/people/xuids`, {
                    headers: {
                        "Authorization": XBL,
                        "Content-Type": "application/json",
                        "Content-Length": JSON.stringify({
                            "xuids": XUIDS
                        }).length.toString()

                    },
                    body: JSON.stringify({
                        "xuids": XUIDS
                    })
                });
                if (!response.ok) {
                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to fetch friends: ${JSON.stringify(errorDisplayed, null, 4)}`);
                }
                return (await response.json())
            },

            async getFriends(XUID: XUID, options: { view: ("All" | "Favorite" | "LegacyXboxLiveFriends"), maxItems: number, startIndex: number }): Promise<{ "people": { "xuid": XUID, "isFavorite": boolean, "isFollowingCaller": boolean, "socialNetworks"?: string[] }, "totalCount": number }> {
                const params = new URLSearchParams();
                for (const key in options) {
                    params.append(key, String(options[key]));
                }

                const response = await restful.get(`https://social.xboxlive.com/users/xuid(${XUID})/people${params.size > 0 ? `?${params.toString()}` : ''}`);
                if (!response.ok) {

                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to fetch friends: ${JSON.stringify(errorDisplayed, null, 4)}`);
                }
                return await response.json();
            },
            async getViewAsUser(viewingXUID: XUID): Promise<{ "targetFollowingCount": number, "targetFollowerCount": number, "isCallerFollowingTarget": boolean, "isTargetFollowingCaller": boolean, "hasCallerMarkedTargetAsFavorite": boolean, "hasCallerMarkedTargetAsKnown": boolean, "legacyFriendStatus": string, "recentChangeCount": number, "watermark": string }> {
                const response = await restful.get(`https://social.xboxlive.com/users/xuid(${viewingXUID})/summary`, {});
                if (!response.ok) {
                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to fetch view: ${JSON.stringify(errorDisplayed, null, 4)} `);
                }
                return await response.json();
            }
        }
    }


    public get clubs() {
        return {
            getChat: async (clubId: string, amount: number) => {
                const response = await this.restful.get(`https://chatfd.xboxlive.com:443/channels/Club/${clubId}/messages/history?maxItems=${amount}`);
                if (!response.ok) {
                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to fetch chat: ${JSON.stringify(errorDisplayed, null, 4)} `);
                }
                return await response.json();
            },
            getClub: async (clubId: string) => {
                const response = await this.restful.get(`https://clubhub.xboxlive.com:443/clubs/ids(${clubId})/decoration/ClubPresence,Roster,Settings`);
                if (!response.ok) {
                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to fetch club: ${JSON.stringify(errorDisplayed, null, 4)} `);
                }
                return (await response.json()) as {
                    clubs: {
                        id: string,
                        name: string,
                        type: "secret" | "public",
                        shortName: null | string,
                        description: string,
                        ownerXuid: string,
                        founderXuid: string,
                        creationDateUtc: string,
                        displayImageUrl: string,
                        backgroundImageUrl: string,
                        preferredLocale: string,
                        associatedTitles: string[],
                        tags: string[],
                        settings: any,
                        preferredColor: {
                            "primaryColor": string,
                            "secondaryColor": string,
                            "tertiaryColor": string
                        },
                        followersCount: number,
                        membersCount: number,
                        moderatorsCount: number,
                        recommendedCount: number,
                        requestedCount: number,
                        clubPresenceCount: number,
                        clubPresenceTodayCount: number,
                        roster: {
                            moderator: {
                                "actorXuid": string,
                                "xuid": string,
                                "createdDate": string
                            }[]
                        },
                        targetRoles: null | any,
                        clubPresence: {
                            "xuid": string,
                            "lastSeenTimestamp": string,
                            "lastSeenState": "NotInClub" | string
                        }[],
                        state: "None" | string,
                        suspendedUntilUtc: null | string,
                        reportCount: number,
                        reportedItemsCount: number,
                    }[],
                    "searchFacetResults": null | any,
                    "recommendationCounts": null | number
                }
            },
            getFeed: async (clubId: string, amount: number) => {
                const response = await this.restful.get(`https://avty.xboxlive.com:443/clubs/clubId(${clubId})/activity/feed?numItems=${amount}`);
                if (!response.ok) {
                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to fetch club feed: ${JSON.stringify(errorDisplayed, null, 4)} `);
                }
                return await response.json();
            },
            findClub: async (xuid: string) => {
                const response = await this.restful.get(`https://clubhub.xboxlive.com:443/clubs/search/decoration/detail?count=30&q=${xuid}&tags=&titles=`);
                if (!response.ok) {
                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to fetch club: ${JSON.stringify(errorDisplayed, null, 4)} `);
                }
                return await response.json();
            },
            sendFeed: async (message: string, titleId: number, target: "all" | "club", type: "text" | "image" | "video") => {
                const response = await this.restful.post(`https://userposts.xboxlive.com:443/users/me/posts`, {
                    body: JSON.stringify({
                        message,
                        titleId,
                        target,
                        type
                    })
                });
                if (!response.ok) {
                    let errorDisplayed = {} as any;
                    try {
                        errorDisplayed.json = await response.json();
                    } catch { };
                    errorDisplayed.statusText = response.statusText;
                    errorDisplayed.status = response.status;
                    errorDisplayed.url = response.url;
                    errorDisplayed.headers = response.headers;
                    errorDisplayed.ok = response.ok;
                    try {
                        errorDisplayed.text = await response.text();
                    } catch { };
                    throw new Error(`Failed to send feed: ${JSON.stringify(errorDisplayed, null, 4)} `);
                }
                return await response.json();
            }

        }
    }
}