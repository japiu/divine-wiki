import Image from "next/image";
import { BookIcon, PencilIcon, MessageCircleIcon } from "lucide-react";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { i18n } from "@/lib/i18n";
import { discordInviteUrl } from "@/lib/config";
import DivineLogo from "@/app/icon0.svg";
import { getMessages } from "./locale";

export function baseOptions(
  locale: string,
  docsLayout?: boolean,
): BaseLayoutProps {
  const messages = getMessages(locale);

  const options: BaseLayoutProps = {
    i18n,
    nav: {
      title: (
        <>
          <div className="relative h-10 w-10 lg:h-8 lg:w-8">
            <Image alt="Divine Skins" src={DivineLogo} fill />
          </div>
          <span className="font-medium">{messages.nav.title}</span>
        </>
      ),
      url: `/${locale}/`,
    },
    links: [],
  };

  if (!docsLayout) {
    options.links?.push(
      {
        icon: <BookIcon />,
        text: messages.nav.documentation,
        url: `/${locale}/docs`,
        active: "nested-url",
      },
      {
        icon: <PencilIcon />,
        text: messages.nav.contribute,
        url: `/${locale}/contribute`,
      },
      {
        icon: <MessageCircleIcon />,
        text: messages.nav.discord,
        url: discordInviteUrl,
      },
    );
  }

  return options;
}
