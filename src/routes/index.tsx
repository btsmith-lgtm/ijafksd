import { createFileRoute } from "@tanstack/react-router";
import NovaApp from "@/components/nova/NovaApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The World's Best Information on the American Revolution" },
      {
        name: "description",
        content:
          "The world's best information on the American Revolution — explore history, key figures, battles, and founding documents all in one place.",
      },
      { property: "og:title", content: "The World's Best Information on the American Revolution" },
      {
        property: "og:description",
        content:
          "The world's best information on the American Revolution — explore history, key figures, battles, and founding documents all in one place.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://uhfedsjvn.lovable.app" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://uhfedsjvn.lovable.app" }],
  }),
  component: NovaApp,
});
