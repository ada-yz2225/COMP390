import numpy as np


def adaptive_sensitivity(data):
    """Calculate sensitivity dynamically based on data range."""
    return data.max() - data.min()


def robust_sensitivity(data):
    """Calculate sensitivity based on IQR to handle outliers."""
    q1, q3 = np.percentile(data, [25, 75])
    return q3 - q1


def mode_sensitivity(data):
    """Estimate sensitivity for mode queries."""
    value_counts = data.value_counts()
    if len(value_counts) == 0:
        return 1
    return value_counts.max() / len(data)


class EpsilonDifferentialPrivacy:

    def test(self):
        return {"Test": "This is a test algorithm."}

    def mean(self, df, epsilon):

        numeric_cols = df.select_dtypes(include=[np.number]).columns

        if numeric_cols.empty:
            return "No numeric columns found in the dataset"

        result = {}
        for col in numeric_cols:
            true_mean = df[col].mean()
            scale = adaptive_sensitivity(df[col]) / epsilon
            noise = np.random.laplace(0, scale)
            dp_mean = true_mean + noise
            result[col] = dp_mean

        return result

    def median(self, df, epsilon):

        numeric_cols = df.select_dtypes(include=[np.number]).columns

        if numeric_cols.empty:
            return "No numeric columns found in the dataset"

        result = {}
        for col in numeric_cols:
            true_median = df[col].median()
            scale = robust_sensitivity(df[col]) / epsilon
            noise = np.random.laplace(0, scale)
            dp_mean = true_median + noise
            result[col] = dp_mean

        return result

    def mode(self, df, epsilon):

        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if numeric_cols.empty:
            return "No numeric columns found in the dataset"

        result = {}
        for col in numeric_cols:
            value_counts = df[col].value_counts()
            if value_counts.empty:
                return None
            scale = mode_sensitivity(df) / epsilon
            noise_counts = value_counts + np.random.laplace(0, scale, size=len(value_counts))
            result[col] = float(noise_counts.idxmax())

        return result


class ApproximateDifferentialPrivacy:

    @staticmethod
    def gaussian_noise(scale, size=1):
        return np.random.normal(0, scale, size)

    def mean(self, df, epsilon):

        delta = 1 / (len(df) ** 2)
        numeric_cols = df.select_dtypes(include=[np.number]).columns

        if numeric_cols.empty:
            return "No numeric columns found in the dataset"

        result = {}
        for col in numeric_cols:
            true_mean = df[col].mean()
            scale = np.sqrt(2 * np.log(1.25 / delta)) * adaptive_sensitivity(df[col]) / epsilon
            noise = self.gaussian_noise(scale)
            result[col] = float(true_mean + noise)

        return result

    def median(self, df, epsilon):

        delta = 1 / (len(df) ** 2)
        numeric_cols = df.select_dtypes(include=[np.number]).columns

        if numeric_cols.empty:
            return "No numeric columns found in the dataset"

        result = {}
        for col in numeric_cols:
            scale = np.sqrt(2 * np.log(1.25 / delta)) * robust_sensitivity(df[col]) / epsilon
            noise = self.gaussian_noise(scale)
            sorted_data = df[col].sort_values()
            median = sorted_data.iloc[len(sorted_data) // 2]
            result[col] = float(median + noise)

        return result

    def mode(self, df, epsilon):

        delta = 1 / (len(df) ** 2)
        numeric_cols = df.select_dtypes(include=[np.number]).columns

        if numeric_cols.empty:
            return "No numeric columns found in the dataset"

        result = {}
        for col in numeric_cols:
            counts = df[col].value_counts()
            scale = np.sqrt(2 * np.log(1.25 / delta)) * mode_sensitivity(df) / epsilon
            noisy_counts = counts + self.gaussian_noise(scale, len(counts))
            result[col] = float(noisy_counts.idxmax())

        return result
