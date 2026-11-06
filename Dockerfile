FROM oven/bun:1

WORKDIR /workspace
COPY --chown=501:3000 . .

RUN bun install --frozen-lockfile
RUN bun run build

USER bun

CMD ["bun", "start"]