FROM eclipse-temurin:17-jdk-alpine as build
WORKDIR /app
COPY pom.xml .
COPY settings.xml .m2/settings.xml 2>/dev/null || true
COPY adopter-service/pom.xml adopter-service/
COPY adopter-service/src adopter-service/src
RUN apk add --no-cache maven && mvn -f adopter-service/pom.xml clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/adopter-service/target/*.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "app.jar"]
