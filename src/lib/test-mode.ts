export function isTestKey(apiKey: string): boolean {
  return apiKey.startsWith("gb_test_");
}

export function isTestPayment(payment: { is_test?: boolean }): boolean {
  return payment.is_test === true;
}
