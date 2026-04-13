FROM maven:3.9.9-eclipse-temurin-17 as build
WORKDIR /app
COPY pom.xml .
COPY animal-service/pom.xml animal-service/
COPY animal-service/src animal-service/src
RUN mvn -f animal-service/pom.xml clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/animal-service/target/*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
