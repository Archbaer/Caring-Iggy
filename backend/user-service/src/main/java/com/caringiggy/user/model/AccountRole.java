package com.caringiggy.user.model;

public enum AccountRole {
    ADOPTER,
    STAFF,
    ADMIN,
    EMPLOYEE;

    public boolean isEmployeeRole() {
        return this == STAFF || this == ADMIN || this == EMPLOYEE;
    }
}
