FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf

RUN mkdir -p /etc/nginx/ssl

RUN mkdir -p /usr/share/nginx/html

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
