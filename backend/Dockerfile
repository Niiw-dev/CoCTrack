FROM php:8.3-fpm-alpine
RUN apk add --no-cache postgresql-dev libzip-dev zip unzip git icu-dev oniguruma-dev curl bash
RUN docker-php-ext-install pdo pdo_pgsql pgsql zip intl mbstring opcache
COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html
COPY . .
RUN composer install --no-interaction --no-progress --prefer-dist
RUN mkdir -p storage/framework/{sessions,views,cache} storage/logs bootstrap/cache && chmod -R 775 storage bootstrap/cache
EXPOSE 9000
CMD ["php-fpm"]
