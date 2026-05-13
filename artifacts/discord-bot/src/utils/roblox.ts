import axios from "axios";

export interface RobloxUser {
  id: number;
  name: string;
  displayName: string;
  profileUrl: string;
  avatarUrl?: string;
}

export async function getRobloxUser(username: string): Promise<RobloxUser | null> {
  try {
    const searchRes = await axios.post(
      "https://users.roblox.com/v1/usernames/users",
      { usernames: [username], excludeBannedUsers: false },
      { timeout: 8000 }
    );

    const users = searchRes.data?.data;
    if (!users || users.length === 0) return null;

    const user = users[0];

    let avatarUrl: string | undefined;
    try {
      const avatarRes = await axios.get(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=150x150&format=Png&isCircular=false`,
        { timeout: 5000 }
      );
      avatarUrl = avatarRes.data?.data?.[0]?.imageUrl;
    } catch {
      // avatar is optional
    }

    return {
      id: user.id,
      name: user.name,
      displayName: user.displayName,
      profileUrl: `https://www.roblox.com/users/${user.id}/profile`,
      avatarUrl,
    };
  } catch {
    return null;
  }
}
