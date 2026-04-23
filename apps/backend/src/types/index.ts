import type { FastifyRequest } from "fastify";

export type JwtPayload = {
  userId: string;
};

export type SpotifyTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
};

export type SpotifyRefreshResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token?: string;
};

export type SpotifyUser = {
  id: string;
  display_name: string | null;
  email: string;
};

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: import("fastify").FastifyReply) => Promise<void>;
  }
}
