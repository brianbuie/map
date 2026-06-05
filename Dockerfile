FROM oven/bun:1

WORKDIR /workspace

COPY . .

RUN bun install --frozen-lockfile

USER bun

CMD ["bun", "start"]