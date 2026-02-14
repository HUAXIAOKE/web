import json
import logging
import os
from typing import Any, Dict, List  # pyright: ignore[reportMissingImports]

import requests  # pyright: ignore[reportMissingModuleSource]
from dotenv import load_dotenv  # pyright: ignore[reportMissingImports]

CACHE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bilibili-dynamics.json")


def fetch_bilibili_dynamics() -> List[Dict[str, Any]]:
    """
    获取 Bilibili 动态列表
    
    Returns:
        List[Dict[str, Any]]: 动态列表，格式与 bilibili-dynamics.json 相同
    """
    # 加载环境变量
    load_dotenv()

    bilibili_cookie = os.getenv("BILIBILI_COOKIE", "")
    bilibili_user_agent = os.getenv("BILIBILI_USER_AGENT", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0")
    bilibili_referer = os.getenv("BILIBILI_REFERER", "https://www.bilibili.com/")

    if not bilibili_cookie:
        raise ValueError("未设置 BILIBILI_COOKIE 环境变量，请在 .env 文件中设置 BILIBILI_COOKIE")
    
    headers = {
        "Cookie": bilibili_cookie,
        "User-Agent": bilibili_user_agent,
        "Referer": bilibili_referer,
    }
    
    # UP主UID
    uid = os.getenv("BILIBILI_UID", "")
    if not uid:
        raise ValueError("未设置 BILIBILI_UID 环境变量，请在 .env 文件中设置 BILIBILI_UID")
    
    # API URL
    api_url = "https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/all"
    
    # 请求参数
    params = {
        "host_mid": uid,
        "type": "all",
        "platform": "web",
        "web_location": "333.1365"
    }
    
    # 发送请求
    response = requests.get(api_url, headers=headers, params=params)
    
    if response.status_code != 200:
        raise Exception(f"请求失败: {response.status_code}")
    
    data = response.json()
    
    # 检查响应码
    if data.get("code") != 0:
        raise Exception(f"API返回错误: {data.get('message', '未知错误')}")
    
    # 提取动态列表
    items = data.get("data", {}).get("items", [])

    dynamics = []

    for idx, item in enumerate(items[:5]):
        modules = item.get("modules", {}) or {}
        module_author = modules.get("module_author", {}) or {}
        module_dynamic = modules.get("module_dynamic", {}) or {}
        module_stat = modules.get("module_stat", {}) or {}
        
        # 确保module_dynamic和module_stat是字典
        if not isinstance(module_dynamic, dict):
            module_dynamic = {}
        if not isinstance(module_stat, dict):
            module_stat = {}
        
        # 检查是否是转发动态
        orig = item.get("orig")
        item_type = item.get("type", "")
        # 处理item_type可能是字符串或数字的情况
        if isinstance(item_type, (int, float)):
            item_type = str(item_type)
        
        # 确保orig如果是字典才使用
        if orig is None:
            orig = {}
        elif not isinstance(orig, dict):
            orig = {}
        
        module_desc = module_dynamic.get("desc") or {}
        
        if orig:
            # 如果是转发动态,从orig中获取major信息（封面、标题等）
            orig_modules = orig.get("modules", {}) or {}
            orig_module_dynamic = orig_modules.get("module_dynamic", {}) or {}
            major = orig_module_dynamic.get("major", {}) or {}
            # 但desc仍然使用当前动态的module_dynamic.desc
            desc_source = module_desc
        else:
            # 普通动态
            major = module_dynamic.get("major", {}) or {}
            desc_source = module_desc
        
        # 确保desc_source始终是字典
        if desc_source is None:
            desc_source = {}
        if not isinstance(desc_source, dict):
            desc_source = {}
        
        # 确保major始终是字典
        if major is None:
            major = {}
        if not isinstance(major, dict):
            major = {}
        
        major_type = major.get("type", "")

        need_debug = False
        
        # 提取封面
        cover = ""
        opus_data = {}
        draw_data = {}
        
        if major_type == "MAJOR_TYPE_ARCHIVE":  # 视频
            cover = major.get("archive", {}).get("cover", "")
        elif major_type == "MAJOR_TYPE_DRAW":  # 带图动态
            draw_data = major.get("draw", {}) or {}
            draw_items = draw_data.get("items", [])
            if draw_items:
                first_item = draw_items[0]
                if isinstance(first_item, dict):
                    cover = first_item.get("src", "") or first_item.get("url", "") or first_item.get("src_small", "")
                elif isinstance(first_item, str):
                    cover = first_item
        elif major_type == "MAJOR_TYPE_OPUS":  # 图文动态
            opus_data = major.get("opus", {})
            opus_pics = opus_data.get("pics", [])
            if opus_pics:
                # 图片可能是对象或字符串
                first_pic = opus_pics[0]
                if isinstance(first_pic, dict):
                    # 尝试多种可能的字段名
                    cover = first_pic.get("url", "") or first_pic.get("src", "") or first_pic.get("src_small", "")
                elif isinstance(first_pic, str):
                    cover = first_pic
        elif major_type == "MAJOR_TYPE_ARTICLE":  # 专栏
            covers = major.get("article", {}).get("covers", [])
            if covers:
                cover = covers[0] if isinstance(covers[0], str) else covers[0].get("url", "")
        elif major_type == "MAJOR_TYPE_PGC":  # 剧集
            cover = major.get("pgc", {}).get("cover", "")
        elif major_type == "MAJOR_TYPE_LIVE":  # 直播
            cover = major.get("live", {}).get("cover", "")
        elif major_type == "MAJOR_TYPE_MUSIC":  # 音频
            cover = major.get("music", {}).get("cover", "")
        elif major_type == "MAJOR_TYPE_COURSES":  # 课程
            cover = major.get("courses", {}).get("cover", "")
        elif major_type == "MAJOR_TYPE_UGC_SEASON":  # 合集
            cover = major.get("ugc_season", {}).get("cover", "")
        elif major_type == "MAJOR_TYPE_COMMON":  # 一般类型
            cover = major.get("common", {}).get("cover", "")
        else:
            # 如果major_type为空或未知，尝试检查是否有opus字段
            if "opus" in major:
                opus_data = major.get("opus", {})
                opus_pics = opus_data.get("pics", [])
                if opus_pics:
                    first_pic = opus_pics[0]
                    if isinstance(first_pic, dict):
                        cover = first_pic.get("url", "") or first_pic.get("src", "") or first_pic.get("src_small", "")
                    elif isinstance(first_pic, str):
                        cover = first_pic

        is_word_type = item_type == "17" or item_type == 17 or "WORD" in str(item_type).upper()
        is_draw_type = (item_type == "11" or item_type == 11 or 
                        major_type == "MAJOR_TYPE_DRAW" or 
                        "DRAW" in str(item_type).upper() or
                        "draw" in major)
        
        # 如果识别为带图动态但还没有封面，尝试从major中提取
        if is_draw_type and not cover:
            if not draw_data:
                draw_data = major.get("draw", {}) or {}
            if draw_data:
                draw_items = draw_data.get("items", [])
                if draw_items:
                    first_item = draw_items[0]
                    if isinstance(first_item, dict):
                        cover = first_item.get("src", "") or first_item.get("url", "") or first_item.get("src_small", "")
                    elif isinstance(first_item, str):
                        cover = first_item

        cover_is_opus = "new_dyn" in cover if cover else False
        has_opus_field = "opus" in major or bool(opus_data)
        item_type_is_opus = "OPUS" in str(item_type).upper() if item_type else False
        
        is_opus = (major_type == "MAJOR_TYPE_OPUS" or has_opus_field or cover_is_opus or item_type_is_opus)

        if cover_is_opus:
            is_opus = True
            # 如果还没有opus_data,尝试从major中查找
            if not opus_data:
                # 检查major中是否有opus字段
                if "opus" in major:
                    opus_data = major.get("opus", {})
                else:
                    # 尝试查找所有可能包含opus的字段
                    for key in major.keys():
                        if "opus" in key.lower():
                            opus_data = major.get(key, {})
                            break
                    # 如果还是没有,检查整个major的结构
                    if not opus_data:
                        # 可能opus字段名不同,尝试直接访问可能的字段
                        possible_keys = ["opus", "dynamic_opus", "card_opus"]
                        for key in possible_keys:
                            if key in major:
                                opus_data = major.get(key, {})
                                break
        
        # 提取文字内容的辅助函数
        def extract_text_from_desc(desc_obj):
            """从desc对象中提取文字内容"""
            if not desc_obj or not isinstance(desc_obj, dict):
                return ""
            
            # 优先使用text字段
            text = desc_obj.get("text", "") or ""
            if text:
                return text
            
            # 如果没有text，从rich_text_nodes提取
            rich_text_nodes = desc_obj.get("rich_text_nodes")
            if rich_text_nodes and isinstance(rich_text_nodes, list):
                text_parts = []
                for node in rich_text_nodes:
                    if isinstance(node, dict):
                        # 优先使用text，如果没有则使用orig_text
                        node_text = node.get("text", "") or node.get("orig_text", "")
                        if node_text:
                            text_parts.append(node_text)
                    elif isinstance(node, str):
                        text_parts.append(node)
                if text_parts:
                    return "".join(text_parts)
            
            return ""
        
        # 提取文字内容 (图文动态、纯文字动态、带图动态)
        text_content = ""
        
        # 对于所有动态类型，优先从 module_dynamic.desc 获取文字内容
        # 这是最可靠的方式，因为desc是动态文字内容的直接来源
        text_content = extract_text_from_desc(module_desc)
        
        # 处理纯文字动态 (DYNAMIC_TYPE_WORD)
        if is_word_type:
            # 纯文字动态: 如果还没有获取到，尝试从desc_source获取（可能是转发动态的情况）
            if not text_content:
                text_content = extract_text_from_desc(desc_source)
        
        # 处理图文动态 (MAJOR_TYPE_OPUS)
        elif is_opus:
            # 图文动态: 优先使用 module_dynamic.desc（已经在上面获取）
            # 如果没有，再尝试从 major.opus.summary.text 获取
            if not text_content and opus_data:
                opus_summary = opus_data.get("summary", {})
                if isinstance(opus_summary, dict):
                    text_content = extract_text_from_desc(opus_summary)
                elif isinstance(opus_summary, str):
                    text_content = opus_summary
            
            # 如果还是没有，尝试从desc_source获取（转发动态的情况）
            if not text_content:
                text_content = extract_text_from_desc(desc_source)
        
        # 处理带图动态 (DYNAMIC_TYPE_DRAW) - 可能也有文字描述
        elif is_draw_type:
            if not text_content:
                text_content = extract_text_from_desc(desc_source)

        # 提取标题 (图文动态和纯文字动态不存储标题)
        title = ""
        if not is_opus and not is_word_type:
            if major_type == "MAJOR_TYPE_ARCHIVE":  # 视频
                title = major.get("archive", {}).get("title", "")
            elif major_type == "MAJOR_TYPE_ARTICLE":  # 专栏
                title = major.get("article", {}).get("title", "")
            elif major_type == "MAJOR_TYPE_PGC":  # 剧集
                title = major.get("pgc", {}).get("title", "")
            elif major_type == "MAJOR_TYPE_LIVE":  # 直播
                title = major.get("live", {}).get("title", "")
            elif major_type == "MAJOR_TYPE_MUSIC":  # 音频
                title = major.get("music", {}).get("title", "")
            elif major_type == "MAJOR_TYPE_COURSES":  # 课程
                title = major.get("courses", {}).get("title", "")
            elif major_type == "MAJOR_TYPE_UGC_SEASON":  # 合集
                title = major.get("ugc_season", {}).get("title", "")
            elif major_type == "MAJOR_TYPE_COMMON":  # 一般类型
                title = major.get("common", {}).get("title", "")
        
        # 提取播放量和弹幕数 (图文动态和纯文字动态不存储,仅视频类型有)
        play_count = ""
        danmaku_count = ""
        if not is_opus and not is_word_type:
            if major_type == "MAJOR_TYPE_ARCHIVE":  # 视频
                stat = major.get("archive", {}).get("stat", {})
                play_count = stat.get("play", "")
                danmaku_count = stat.get("danmaku", "")
            elif major_type == "MAJOR_TYPE_PGC":  # 剧集
                stat = major.get("pgc", {}).get("stat", {})
                play_count = stat.get("play", "")
                danmaku_count = stat.get("danmaku", "")
            elif major_type == "MAJOR_TYPE_UGC_SEASON":  # 合集
                stat = major.get("ugc_season", {}).get("stat", {})
                play_count = stat.get("play", "")
                danmaku_count = stat.get("danmaku", "")
        
        # 提取点赞数、评论数、转发数 (使用当前动态的统计数据,不是原动态的)
        like_count = module_stat.get("like", {}).get("count", 0)
        comment_count = module_stat.get("comment", {}).get("count", 0)
        forward_count = module_stat.get("forward", {}).get("count", 0)
        
        # 提取发布时间 (使用时间戳，便于前端格式化)
        publish_time = module_author.get("pub_ts", 0)  # UNIX 秒级时间戳
        
        # 构建动态信息
        if is_word_type:
            # 纯文字动态: 只保留文字、点赞数、评论数、转发数（无封面）
            dynamic_info = {
                "文字": text_content,
                "点赞数": like_count,
                "评论数": comment_count,
                "转发数": forward_count,
                "发布时间": publish_time
            }
        elif is_opus:
            # 图文动态: 只保留封面、文字、点赞数、评论数、转发数
            dynamic_info = {
                "封面": cover,
                "点赞数": like_count,
                "评论数": comment_count,
                "转发数": forward_count,
                "发布时间": publish_time
            }
        elif is_draw_type:
            # 带图动态: 保留封面、文字（如果有）、点赞数、评论数、转发数
            dynamic_info = {
                "封面": cover,
                "点赞数": like_count,
                "评论数": comment_count,
                "转发数": forward_count,
                "发布时间": publish_time
            }
            # 如果有文字内容，也添加
            if text_content:
                dynamic_info["文字"] = text_content
        else:
            # 其他动态: 保留所有字段（视频等）
            dynamic_info = {
                "封面": cover,
                "标题": title,
                "播放量": play_count,
                "弹幕数": danmaku_count,
                "点赞数": like_count,
                "评论数": comment_count,
                "转发数": forward_count,
                "发布时间": publish_time
            }
        
        dynamics.append(dynamic_info)
    
    return dynamics


def load_cached_dynamics() -> List[Dict[str, Any]]:
    if not os.path.exists(CACHE_FILE):
        return []
    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
    except Exception as exc:  # pragma: no cover
        logging.warning("读取 B 站动态缓存失败: %s", exc)
    return []


def save_cached_dynamics(dynamics: List[Dict[str, Any]]) -> None:
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(dynamics, f, ensure_ascii=False, indent=2)
    except Exception as exc:  # pragma: no cover
        logging.error("写入 B 站动态缓存失败: %s", exc)


if __name__ == "__main__":
    try:
        dynamics = fetch_bilibili_dynamics()
        save_cached_dynamics(dynamics)
        print(f"成功获取 {len(dynamics)} 条动态，已保存到 {CACHE_FILE}")
    except Exception as e:  # pragma: no cover
        print(f"错误: {e}")
        exit(1)