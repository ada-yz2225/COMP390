import importlib
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
import os
import filter

app = Flask(__name__)


@app.route('/getFileColumns', methods=['GET'])
def get_df_col_name():
    file_path = request.args.get('file_path')
    if not file_path:
        return jsonify([]), 400

    try:
        df = pd.read_csv(file_path)
        numeric_columns = df.select_dtypes(include=[np.number]).columns.tolist()
        return jsonify(numeric_columns)
    except Exception as e:
        return jsonify([]), 500


def file_exists(url):
    if os.path.exists(url):
        return True
    else:
        return False


def invoke_method(df, class_name, function_name, epsilon):
    try:
        module_name = 'algorithm'
        module = importlib.import_module(module_name)
        clazz = getattr(module, class_name)
        hasattr(clazz, function_name)
        function = getattr(clazz, function_name)

        if isinstance(function, classmethod):
            return function.__func__(clazz, df, epsilon)
        else:
            return function(clazz, df, epsilon)

    except ImportError as e:
        return {"error": f"Module error: {str(e)}"}
    except AttributeError as e:
        return {"error": f"Algorithm not found: {str(e)}"}
    except Exception as e:
        return {"error": f"Analyze failed: {str(e)}"}


@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        # Parse input data
        data = request.get_json()

        epsilon = float(data.get('epsilon'))

        file_path = data['filePath']
        class_name = data['className']
        function_name = data['functionName']

        # For conditional query:
        filters = data['filters']

        # For parallel composition:
        subsets = data['subsets']

        # Validate input
        if not file_exists(file_path):
            return jsonify({"error": "File not found"}), 400

        # Match query methods:
        if subsets is None and filters is None:
            result = invoke_method(pd.read_csv(file_path), class_name, function_name, epsilon)
        # Conditional query
        elif filters is not None and subsets is None:
            df = filter.filter_dataframe(pd.read_csv(file_path), filters)
            result = invoke_method(df, class_name, function_name, epsilon)
        # Parallel composition query
        elif subsets is not None and filters is None:
            result = []
            df = pd.read_csv(file_path)
            for subset in subsets:
                filtered_df = df[(df[subset['columnName']] >= subset['min']) &
                                 (df[subset['columnName']] <= subset['max'])]
                if filtered_df.empty:
                    raise ValueError(f"Filtered dataframe is empty")
                epsilon = subset['epsilon']
                res = invoke_method(filtered_df, class_name, function_name, epsilon)
                result.append(res)
        else:
            result = "Query options and parameters are ambiguous."

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run()
