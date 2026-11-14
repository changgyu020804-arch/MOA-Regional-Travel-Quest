package com.example.drivequest;

import android.car.Car;
import android.car.drivingstate.CarUxRestrictions;
import android.car.drivingstate.CarUxRestrictionsManager;
import android.content.Context;
import android.util.Log;

final class ParkingRestrictions implements AutoCloseable {
    interface Listener {
        void onRestrictionChanged(boolean restricted);
    }

    private final Car car;
    private CarUxRestrictionsManager manager;
    private boolean closed;

    ParkingRestrictions(Context context, Listener listener) {
        car = Car.createCar(context, null, Car.CAR_WAIT_TIMEOUT_DO_NOT_WAIT, (service, ready) -> {
            if (closed) {
                return;
            }

            manager = null;
            if (!ready) {
                listener.onRestrictionChanged(true);
                return;
            }

            try {
                manager = (CarUxRestrictionsManager) service.getCarManager(Car.CAR_UX_RESTRICTION_SERVICE);
                if (manager == null) {
                    listener.onRestrictionChanged(true);
                    return;
                }

                manager.registerListener(restrictions -> {
                    if (!closed) {
                        listener.onRestrictionChanged(isRestricted(restrictions));
                    }
                });
                listener.onRestrictionChanged(isRestricted(manager.getCurrentCarUxRestrictions()));
            } catch (RuntimeException error) {
                Log.w("DriveQuest", "Unable to read driving restrictions", error);
                listener.onRestrictionChanged(true);
            }
        });
    }

    private static boolean isRestricted(CarUxRestrictions restrictions) {
        return restrictions == null || restrictions.isRequiresDistractionOptimization();
    }

    @Override
    public void close() {
        closed = true;
        try {
            if (manager != null) {
                manager.unregisterListener();
            }
        } finally {
            if (car != null) {
                car.disconnect();
            }
        }
    }
}
