import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/invite/$code")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/auth", search: { ref: params.code.slice(0, 20) } });
  },
});
