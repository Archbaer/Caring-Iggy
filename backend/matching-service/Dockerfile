FROM maven:3.9.9-eclipse-temurin-17 as build
WORKDIR /app
COPY pom.xml .
COPY matching-service/pom.xml matching-service/
COPY matching-service/src matching-service/src
RUN mvn -f matching-service/pom.xml clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/matching-service/target/*.jar app.jar
EXPOSE 8083
ENTRYPOINT ["java", "-jar", "app.jar"]
