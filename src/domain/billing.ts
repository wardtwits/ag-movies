export const STAR_BILLING_ORDER_THRESHOLD = 8

export const isStarBillingOrder = (order: number): boolean => order <= STAR_BILLING_ORDER_THRESHOLD
