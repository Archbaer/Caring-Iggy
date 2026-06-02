FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY adopter-service/pom.xml adopter-service/
RUN mvn -f adopter-service/pom.xml -B \
    -Dmaven.wagon.http.retryHandler.count=5 \
    -Dmaven.wagon.httpconnectionManager.ttlSeconds=60 \
    dependency:go-offline
COPY adopter-service/src adopter-service/src
RUN mvn -f adopter-service/pom.xml -B -Dmaven.wagon.http.retryHandler.count=5 clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/adopter-service/target/*.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "app.jar"]
