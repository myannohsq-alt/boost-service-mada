import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/connexion")({
  beforeLoad: () => {
    throw redirect({ to: "/auth", statusCode: 301 });
  },
});
