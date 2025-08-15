export const createTournamentSchema = {
  body: {
    type: "object",
    required: [
      "name",
      "status",
      "prizePool",
      "entryFee",
      "difficulty",
      "startTime",
      "username",
      "rank",
      "country",
    ],
    properties: {
      name: { type: "string" },
      status: { type: "string" },
      prizePool: { type: "integer" },
      entryFee: { type: "integer" },
      difficulty: { type: "string" },
      startTime: { type: "string", format: "date-time" },
      username: { type: "string" },
      rank: { type: "string" },
      country: { type: "string" },
    },
  },
};

export const joinTournamentSchema = {
  body: {
    type: "object",
    required: ["tournamentId", "username"],
    properties: {
      username: { type: "string" },
      rank: { type: "string" },
      country: { type: "string" },
      tournamentId: { type: "string" },
    },
  },
  headers: {
    type: "object",
    required: ["x-user-id"],
    properties: {
      "x-user-id": { type: "string" },
    },
  },
};

export const leaveTournamentSchema = {
  body: {
    type: "object",
    required: ["tournamentId"],
    properties: {
      tournamentId: { type: "string" },
    },
  },
  headers: {
    type: "object",
    required: ["x-user-id"],
    properties: {
      "x-user-id": { type: "string" },
    },
  },
};

export const reportMatchSchema = {
  body: {
    type: "object",
    required: ["matchId", "winnerId", "score"],
    properties: {
      matchId: { type: "string" },
      winnerId: { type: "string" },
      score: { type: "string" },
    },
  },
};
