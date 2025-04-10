#!/bin/bash

echo "Проверка занятости портов 4000 и 4001..."

# Проверяем порты с помощью lsof, netstat и ss
echo "Используем lsof:"
lsof -i :4000 || echo "Порт 4000 свободен (lsof)"
lsof -i :4001 || echo "Порт 4001 свободен (lsof)"

echo -e "\nИспользуем netstat:"
netstat -tulpn 2>/dev/null | grep ':4000 ' || echo "Порт 4000 свободен (netstat)"
netstat -tulpn 2>/dev/null | grep ':4001 ' || echo "Порт 4001 свободен (netstat)"

echo -e "\nИспользуем ss:"
ss -tulpn | grep ':4000 ' || echo "Порт 4000 свободен (ss)"
ss -tulpn | grep ':4001 ' || echo "Порт 4001 свободен (ss)"

echo -e "\nПроверка запущенных Docker контейнеров:"
docker ps -a

echo -e "\nПроверка сетей Docker:"
docker network ls