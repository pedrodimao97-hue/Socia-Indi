FROM node:22-alpine AS build

WORKDIR /app
ARG VITE_API_URL=http://localhost:4000/api
ARG VITE_RTC_ICE_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
ARG VITE_RTC_TURN_USERNAME=
ARG VITE_RTC_TURN_CREDENTIAL=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_RTC_ICE_SERVERS=$VITE_RTC_ICE_SERVERS
ENV VITE_RTC_TURN_USERNAME=$VITE_RTC_TURN_USERNAME
ENV VITE_RTC_TURN_CREDENTIAL=$VITE_RTC_TURN_CREDENTIAL

COPY package.json ./
RUN npm install

COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
