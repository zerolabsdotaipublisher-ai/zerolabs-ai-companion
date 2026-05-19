import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function appendSearchParams(
  target: URLSearchParams,
  searchParams: Record<string, string | string[] | undefined>,
): void {
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      target.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        target.append(key, item);
      }
    }
  }
}

export default async function LoginPage({
  searchParams,
}: LoginPageProps): Promise<never> {
  const redirectSearchParams = new URLSearchParams();
  appendSearchParams(redirectSearchParams, (await searchParams) ?? {});

  const search = redirectSearchParams.toString();
  redirect(search ? `/signup?${search}` : "/signup");
}
