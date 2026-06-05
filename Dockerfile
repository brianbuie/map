FROM oven/bun:1

WORKDIR /workspace

COPY . .

RUN bun install --frozen-lockfile
RUN bun run build

USER bun

CMD ["bun", "start"]