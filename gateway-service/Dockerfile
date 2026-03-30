FROM eclipse-temurin:17-jdk-alpine as build
WORKDIR /app
COPY pom.xml .
COPY settings.xml .m2/settings.xml 2>/dev/null || true
COPY gateway-service/pom.xml gateway-service/
COPY gateway-service/src gateway-service/src
RUN apk add --no-cache maven && mvn -f gateway-service/pom.xml clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/gateway-service/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
