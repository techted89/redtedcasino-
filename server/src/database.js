// A mock in-memory database
const users = {
  '1': { id: '1', username: 'player1', balance: 1000 },
  '2': { id: '2', username: 'player2', balance: 500 },
};

const admins = {
    'admin1': {id: 'admin1', username: 'admin'}
}

export const getUser = (userId) => {
  return users[userId];
};

export const createUser = (username, initialBalance) => {
    const newUser = {
        id: `user-${Date.now()}`,
        username,
        balance: initialBalance
    }
    users[newUser.id] = newUser
    return newUser
}

export const updateUserBalance = (userId, amount) => {
  if (users[userId]) {
    users[userId].balance += amount;
    return users[userId];
  }
  return null;
};

export const getAllUsers = () => {
  return Object.values(users);
};

export const getAdmin = (adminId) => {
    return admins[adminId]
}
