FROM python:3.12-alpine
RUN adduser -D -u 1000 runner
USER runner
WORKDIR /sandbox
CMD ["sh", "-c", "python3 -c \"import base64,os;exec(base64.b64decode(os.environ.get('CODE_B64','')).decode('utf8'))\""]
