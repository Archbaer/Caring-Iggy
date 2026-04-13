FROM maven:3.9.9-eclipse-temurin-17 as build
WORKDIR /app
COPY pom.xml .
COPY reporting-service/pom.xml reporting-service/
COPY reporting-service/src reporting-service/src
RUN mvn -f reporting-service/pom.xml clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/reporting-service/target/*.jar app.jar
EXPOSE 8084
ENTRYPOINT ["java", "-jar", "app.jar"]
