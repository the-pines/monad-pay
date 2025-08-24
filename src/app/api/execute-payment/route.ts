// get the payment order
// get address using the userId associated with the cardId (the payment has the cardId)
// get the merchant amount and parse it (we are storing raw stripe values)
// get the price of the amount (in gbp) to usd
// use the executor private key to create a transaction from the user address to ours for the same amount of usdc (we have permit of the usdc)
