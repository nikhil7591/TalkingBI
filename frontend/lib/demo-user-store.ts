type DemoUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
};

declare global {
  var __talkingBiDemoUsers: DemoUser[] | undefined;
}

const users = global.__talkingBiDemoUsers || [];
if (!global.__talkingBiDemoUsers) {
  global.__talkingBiDemoUsers = users;
}

export function findDemoUserByEmail(email: string): DemoUser | undefined {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function addDemoUser(user: DemoUser): DemoUser {
  users.push(user);
  return user;
}
