export const TOKEN_BUCKET_LUA_SCRIPT = `
    local key = KEYS[1]

    local maxTokens = tonumber(ARGV[1])
    local refillRate = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])

    local data = redis.call("HMGET", key, "tokens", "lastRefill")

    local tokens = tonumber(data[1])
    local lastRefill = tonumber(data[2])

    if tokens == nil then
        tokens = maxTokens
        lastRefill = now
    end

    -- Calculate refill
    local elapsed = now - lastRefill
    local refill = (elapsed / 1000) * refillRate

    tokens = math.min(maxTokens, tokens + refill)

    local allowed = 0

    if tokens >= 1 then
        tokens = tokens - 1
        allowed = 1
    end

    redis.call(
        "HMSET",
        key,
        "tokens",
        tokens,
        "lastRefill",
        now
    )

    redis.call("EXPIRE", key, 3600)

    return {allowed, tokens}
`;
