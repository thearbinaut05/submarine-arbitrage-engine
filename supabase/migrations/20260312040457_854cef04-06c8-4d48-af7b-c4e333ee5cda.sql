-- Add DELETE policies for arbitrage_opportunities table
CREATE POLICY "Users can delete their own opportunities" 
ON public.arbitrage_opportunities FOR DELETE 
USING (auth.uid() = user_id);

-- Add DELETE policy for transactions table
CREATE POLICY "Users can delete their own transactions"
ON public.transactions FOR DELETE
USING (auth.uid() = user_id);

-- Add DELETE policy for user_settings table
CREATE POLICY "Users can delete their own settings"
ON public.user_settings FOR DELETE
USING (auth.uid() = user_id);