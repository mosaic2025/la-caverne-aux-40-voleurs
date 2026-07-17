FROM node:22-alpine
RUN adduser -D -u 1000 runner
USER runner
WORKDIR /sandbox
ENV NODE_OPTIONS=--max-old-space-size=96
CMD ["node", "-e", "eval(Buffer.from(process.env.CODE_B64||'', 'base64').toString('utf8'))"]
