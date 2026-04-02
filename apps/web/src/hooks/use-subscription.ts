import { useCustomer } from "autumn-js/react";

export function useSubscription() {
  const customerResult = useCustomer({
    expand: ["invoices", "subscriptions.plan"],
  });
  const { data: customer, isLoading } = customerResult;

  const isPro = customer?.subscriptions?.some(
    (sub) => !sub.autoEnable && sub.status === "active",
  ) ?? false;

  return { isPro, isLoading, customer, ...customerResult };
}
