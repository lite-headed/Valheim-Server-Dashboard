# Use a lightweight Nginx base image
FROM nginx:alpine

# Copy your Nginx configuration file into the container
COPY /nginx/nginx.conf /etc/nginx/nginx.conf

# (Optional) Copy your HTML/static files into the container
COPY . /usr/share/nginx/html/

# Expose port 80 (or your desired port)
EXPOSE 80

# Nginx starts by default, so no CMD is needed