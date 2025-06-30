import { RateLimiterMemory } from "rate-limiter-flexible";

export const rate_limiter = new RateLimiterMemory({ points: 6, duration: 2 });

export const limit_consumer = async (ctx, next) => {
	const userId = ctx.from?.id?.toString();

	if (!userId) {
		return next();
	}

	try {
		await rate_limiter.consume(userId);
		return next();
	} catch (rejRes) {
		await ctx.reply(`Притормози ковбой, жмешь кнопки слишком быстро`);
	}
};
